function refersToLocation(valueExpr, locationId, namesLower) {
  const nameList = namesLower.length > 0 ? namesLower : ["\u0000"];
  return {
    $let: {
      vars: { v: valueExpr },
      in: {
        $and: [
          { $ne: ["$$v", null] },
          { $ne: ["$$v", ""] },
          {
            $or: [
              {
                $eq: [
                  {
                    $toLower: {
                      $convert: {
                        input: { $ifNull: ["$$v._id", "$$v"] },
                        to: "string",
                        onError: "",
                        onNull: "",
                      },
                    },
                  },
                  String(locationId).toLowerCase(),
                ],
              },
              {
                $in: [
                  {
                    $toLower: {
                      $trim: {
                        input: {
                          $convert: {
                            input: {
                              $ifNull: [
                                "$$v.name",
                                { $ifNull: ["$$v.siteName", "$$v"] },
                              ],
                            },
                            to: "string",
                            onError: "",
                            onNull: "",
                          },
                        },
                      },
                    },
                  },
                  nameList,
                ],
              },
            ],
          },
        ],
      },
    },
  };
}

function withoutLocation(arrayExpr, locationId, namesLower) {
  return {
    $filter: {
      input: { $ifNull: [arrayExpr, []] },
      as: "item",
      cond: {
        $not: [refersToLocation("$$item", locationId, namesLower)],
      },
    },
  };
}

function clearIfLocation(fieldExpr, locationId, namesLower) {
  return {
    $cond: [
      refersToLocation(fieldExpr, locationId, namesLower),
      "$$REMOVE",
      fieldExpr,
    ],
  };
}

// Remove a location from employee records in every stored form:
// ObjectId, id string, location name, and embedded {_id, name} objects.
export async function detachEmployeesFromLocation(db, location, employeeObjectIds) {
  if (!employeeObjectIds.length) return;

  const locationId = location._id.toString();
  const namesLower = [location.name, location.siteName]
    .map((name) => String(name || "").trim().toLowerCase())
    .filter(Boolean);

  await db.collection("employees").updateMany({ _id: { $in: employeeObjectIds } }, [
    {
      $set: {
        workLocations: withoutLocation("$workLocations", locationId, namesLower),
        workLocationsDetails: withoutLocation(
          "$workLocationsDetails",
          locationId,
          namesLower
        ),
        workLocation: clearIfLocation("$workLocation", locationId, namesLower),
        workLocationName: clearIfLocation(
          "$workLocationName",
          locationId,
          namesLower
        ),
        workLocationId: clearIfLocation(
          "$workLocationId",
          locationId,
          namesLower
        ),
        "personalDetails.workLocation": clearIfLocation(
          "$personalDetails.workLocation",
          locationId,
          namesLower
        ),
        updatedAt: "$$NOW",
      },
    },
  ]);
}
