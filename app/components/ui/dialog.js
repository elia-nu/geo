import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

const Dialog = ({ children, open, onOpenChange, ...props }) => {
  return React.cloneElement(children, { open, onOpenChange, ...props });
};

const DialogTrigger = React.forwardRef(
  ({ asChild, children, ...props }, ref) => {
    if (asChild) {
      return React.cloneElement(children, { ref, ...props });
    }
    return React.cloneElement(children, { ref, ...props });
  }
);

DialogTrigger.displayName = "DialogTrigger";

const DialogContent = React.forwardRef(
  ({ className = "", children, open, onOpenChange, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(open || false);

    useEffect(() => {
      setIsOpen(open || false);
    }, [open]);

    const handleClose = () => {
      setIsOpen(false);
      onOpenChange?.(false);
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
        <div
          ref={ref}
          className={`relative bg-background rounded-lg shadow-lg w-full max-w-lg mx-4 ${className}`}
          {...props}
        >
          {children}
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>
      </div>
    );
  }
);

DialogContent.displayName = "DialogContent";

const DialogHeader = React.forwardRef(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`}
    {...props}
  />
));

DialogHeader.displayName = "DialogHeader";

const DialogTitle = React.forwardRef(({ className = "", ...props }, ref) => (
  <h2
    ref={ref}
    className={`text-lg font-semibold leading-none tracking-tight ${className}`}
    {...props}
  />
));

DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef(
  ({ className = "", ...props }, ref) => (
    <p
      ref={ref}
      className={`text-sm text-muted-foreground ${className}`}
      {...props}
    />
  )
);

DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
};
