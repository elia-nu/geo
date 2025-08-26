import React, {
  useState,
  useRef,
  useEffect,
  createContext,
  useContext,
} from "react";
import { ChevronDown } from "lucide-react";

const SelectContext = createContext();

const Select = ({ children, onValueChange, value, ...props }) => {
  return (
    <SelectContext.Provider value={{ onValueChange, value }}>
      {React.cloneElement(children, { ...props })}
    </SelectContext.Provider>
  );
};

const SelectTrigger = React.forwardRef(
  ({ className = "", children, ...props }, ref) => {
    const { onValueChange, value } = useContext(SelectContext);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState(value);
    const triggerRef = useRef(null);

    useEffect(() => {
      setSelectedValue(value);
    }, [value]);

    const handleClick = () => {
      setIsOpen(!isOpen);
    };

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (triggerRef.current && !triggerRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    return (
      <div className="relative" ref={triggerRef}>
        <button
          ref={ref}
          type="button"
          className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          onClick={handleClick}
          {...props}
        >
          {selectedValue || children}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
        {isOpen && <SelectContent setIsOpen={setIsOpen} />}
      </div>
    );
  }
);

SelectTrigger.displayName = "SelectTrigger";

const SelectContent = React.forwardRef(
  ({ className = "", children, setIsOpen, ...props }, ref) => {
    const { onValueChange } = useContext(SelectContext);

    return (
      <div
        ref={ref}
        className={`absolute top-full z-50 w-full rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 ${className}`}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && child.type === SelectItem) {
            return React.cloneElement(child, {
              onValueChange,
              setIsOpen,
            });
          }
          return child;
        })}
      </div>
    );
  }
);

SelectContent.displayName = "SelectContent";

const SelectItem = React.forwardRef(
  (
    { className = "", children, value, onValueChange, setIsOpen, ...props },
    ref
  ) => {
    const handleClick = () => {
      onValueChange(value);
      setIsOpen(false);
    };

    return (
      <div
        ref={ref}
        className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className}`}
        onClick={handleClick}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SelectItem.displayName = "SelectItem";

const SelectValue = React.forwardRef(({ placeholder, ...props }, ref) => (
  <span ref={ref} {...props}>
    {placeholder}
  </span>
));

SelectValue.displayName = "SelectValue";

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
