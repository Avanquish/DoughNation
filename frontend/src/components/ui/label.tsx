import React from "react";
import { cn } from "../../lib/utils";

const Label = React.forwardRef((props, ref) => {
  const { className, ...rest } = props;

  return (
    <label
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      ref={ref}
      {...rest}
    />
  );
});

Label.displayName = "Label";

export { Label };