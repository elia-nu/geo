import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../audit/route";

// Get task dependency graph for a project
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId || !ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: "Valid project ID is required" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Fetch all tasks for the project with their dependencies
    const pipeline = [
      { $match: { projectId: new ObjectId(projectId) } },
      {
        $lookup: {
          from: "tasks",
          localField: "dependencies",
          foreignField: "_id",
          as: "dependentTasks",
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          status: 1,
          priority: 1,
          startDate: 1,
          dueDate: 1,
          progress: 1,
          assignedTo: 1,
          dependencies: 1,
          dependentTasks: {
            $map: {
              input: "$dependentTasks",
              as: "task",
              in: {
                _id: "$$task._id",
                title: "$$task.title",
                status: "$$task.status",
                priority: "$$task.priority",
                progress: "$$task.progress",
              },
            },
          },
        },
      },
    ];

    const tasks = await db.collection("tasks").aggregate(pipeline).toArray();

    // Build dependency graph
    const dependencyGraph = {
      nodes: tasks.map((task) => ({
        id: task._id.toString(),
        title: task.title,
        status: task.status,
        priority: task.priority,
        progress: task.progress,
        startDate: task.startDate,
        dueDate: task.dueDate,
        assignedCount: task.assignedTo?.length || 0,
      })),
      edges: [],
    };

    // Add edges for dependencies
    tasks.forEach((task) => {
      task.dependencies.forEach((depId) => {
        dependencyGraph.edges.push({
          from: depId.toString(),
          to: task._id.toString(),
          type: "dependency",
        });
      });
    });

    // Detect circular dependencies
    const circularDependencies = detectCircularDependencies(dependencyGraph);

    // Calculate critical path
    const criticalPath = calculateCriticalPath(tasks);

    return NextResponse.json({
      success: true,
      dependencyGraph,
      circularDependencies,
      criticalPath,
      statistics: {
        totalTasks: tasks.length,
        tasksWithDependencies: tasks.filter((t) => t.dependencies.length > 0)
          .length,
        totalDependencies: dependencyGraph.edges.length,
        hasCircularDependencies: circularDependencies.length > 0,
      },
    });
  } catch (error) {
    console.error("Error fetching task dependencies:", error);
    return NextResponse.json(
      { error: "Failed to fetch task dependencies" },
      { status: 500 }
    );
  }
}

// Add or update task dependencies
export async function POST(request) {
  try {
    const db = await getDb();
    const data = await request.json();

    const { taskId, dependencies, updatedBy } = data;

    if (!taskId || !ObjectId.isValid(taskId)) {
      return NextResponse.json(
        { error: "Valid task ID is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(dependencies)) {
      return NextResponse.json(
        { error: "Dependencies must be an array" },
        { status: 400 }
      );
    }

    // Validate all dependency IDs
    const validDependencies = dependencies.filter((id) => ObjectId.isValid(id));
    if (validDependencies.length !== dependencies.length) {
      return NextResponse.json(
        { error: "All dependency IDs must be valid ObjectIds" },
        { status: 400 }
      );
    }

    const dependencyObjectIds = validDependencies.map((id) => new ObjectId(id));

    // Check if task exists
    const task = await db.collection("tasks").findOne({
      _id: new ObjectId(taskId),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check if all dependency tasks exist and are in the same project
    const dependentTasks = await db
      .collection("tasks")
      .find({
        _id: { $in: dependencyObjectIds },
      })
      .toArray();

    if (dependentTasks.length !== dependencyObjectIds.length) {
      return NextResponse.json(
        { error: "One or more dependency tasks not found" },
        { status: 404 }
      );
    }

    // Ensure all dependencies are in the same project
    const differentProjectDeps = dependentTasks.filter(
      (depTask) => depTask.projectId.toString() !== task.projectId.toString()
    );

    if (differentProjectDeps.length > 0) {
      return NextResponse.json(
        { error: "Dependencies must be from the same project" },
        { status: 400 }
      );
    }

    // Check for circular dependencies
    const wouldCreateCircular = await checkCircularDependency(
      db,
      taskId,
      dependencyObjectIds
    );

    if (wouldCreateCircular) {
      return NextResponse.json(
        {
          error: "Adding these dependencies would create a circular dependency",
        },
        { status: 400 }
      );
    }

    // Update task with new dependencies
    const result = await db.collection("tasks").updateOne(
      { _id: new ObjectId(taskId) },
      {
        $set: {
          dependencies: dependencyObjectIds,
          updatedAt: new Date(),
        },
        $push: {
          activityLog: {
            action: "dependencies_updated",
            userId: updatedBy ? new ObjectId(updatedBy) : null,
            timestamp: new Date(),
            details: `Dependencies updated: ${dependentTasks
              .map((t) => t.title)
              .join(", ")}`,
          },
        },
      }
    );

    // Create audit log
    await createAuditLog({
      action: "UPDATE_TASK_DEPENDENCIES",
      entityType: "task",
      entityId: taskId,
      userId: updatedBy || "admin",
      userEmail: "admin@company.com",
      metadata: {
        taskTitle: task.title,
        dependenciesCount: dependencyObjectIds.length,
        dependencyTitles: dependentTasks.map((t) => t.title),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Task dependencies updated successfully",
      dependencies: dependentTasks.map((t) => ({
        _id: t._id,
        title: t.title,
        status: t.status,
        priority: t.priority,
      })),
    });
  } catch (error) {
    console.error("Error updating task dependencies:", error);
    return NextResponse.json(
      { error: "Failed to update task dependencies" },
      { status: 500 }
    );
  }
}

// Helper function to detect circular dependencies
function detectCircularDependencies(graph) {
  const visited = new Set();
  const recursionStack = new Set();
  const cycles = [];

  function hasCycle(nodeId, path = []) {
    if (recursionStack.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      cycles.push(path.slice(cycleStart).concat([nodeId]));
      return true;
    }

    if (visited.has(nodeId)) {
      return false;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const edges = graph.edges.filter((edge) => edge.from === nodeId);
    for (const edge of edges) {
      if (hasCycle(edge.to, [...path])) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    path.pop();
    return false;
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      hasCycle(node.id);
    }
  }

  return cycles;
}

// Helper function to calculate critical path
function calculateCriticalPath(tasks) {
  // Simplified critical path calculation
  // In a real implementation, this would use proper CPM algorithm
  const taskMap = new Map();
  tasks.forEach((task) => {
    taskMap.set(task._id.toString(), {
      ...task,
      earliestStart: 0,
      earliestFinish: 0,
      latestStart: 0,
      latestFinish: 0,
      slack: 0,
    });
  });

  // This is a simplified version - a full implementation would require
  // proper topological sorting and forward/backward pass calculations
  const criticalTasks = tasks
    .filter((task) => task.dependencies.length > 0)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5); // Return top 5 critical tasks

  return criticalTasks.map((task) => ({
    _id: task._id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    dependenciesCount: task.dependencies.length,
  }));
}

// Helper function to check for circular dependencies
async function checkCircularDependency(db, taskId, newDependencies) {
  // Build a graph of current dependencies
  const allTasks = await db
    .collection("tasks")
    .find(
      {},
      {
        projection: { _id: 1, dependencies: 1 },
      }
    )
    .toArray();

  const graph = new Map();
  allTasks.forEach((task) => {
    graph.set(
      task._id.toString(),
      task.dependencies.map((dep) => dep.toString())
    );
  });

  // Add the new dependencies to the graph
  graph.set(
    taskId,
    newDependencies.map((dep) => dep.toString())
  );

  // Check if any of the new dependencies eventually depend on the current task
  function hasPath(from, to, visited = new Set()) {
    if (from === to) return true;
    if (visited.has(from)) return false;

    visited.add(from);
    const dependencies = graph.get(from) || [];

    for (const dep of dependencies) {
      if (hasPath(dep, to, visited)) {
        return true;
      }
    }

    return false;
  }

  // Check if any new dependency creates a cycle
  for (const newDep of newDependencies) {
    if (hasPath(newDep.toString(), taskId)) {
      return true;
    }
  }

  return false;
}
