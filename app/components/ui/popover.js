import React, {
  useState,
  useRef,
  useEffect,
  createContext,
  useContext,
} from "react";

const PopoverContext = createContext();

const Popover = ({ children, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <PopoverContext.Provider value={{ isOpen, setIsOpen }}>
      {React.cloneElement(children, { ...props })}
    </PopoverContext.Provider>
  );
};

const PopoverTrigger = React.forwardRef(
  ({ asChild, children, ...props }, ref) => {
    const { setIsOpen } = useContext(PopoverContext);

    const handleClick = () => {
      setIsOpen((prev) => !prev);
    };

    if (asChild) {
      return React.cloneElement(children, {
        ref,
        onClick: handleClick,
        ...props,
      });
    }
    return React.cloneElement(children, {
      ref,
      onClick: handleClick,
      ...props,
    });
  }
);

PopoverTrigger.displayName = "PopoverTrigger";

const PopoverContent = React.forwardRef(
  (
    { className = "", children, align = "center", sideOffset = 4, ...props },
    ref
  ) => {
    const { isOpen, setIsOpen } = useContext(PopoverContext);
    const contentRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (contentRef.current && !contentRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [setIsOpen]);

    if (!isOpen) return null;

    return (
      <div
        ref={contentRef}
        className={`z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

PopoverContent.displayName = "PopoverContent";

export { Popover, PopoverTrigger, PopoverContent };
