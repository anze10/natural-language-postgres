import { motion } from "framer-motion";
import { Button } from "./ui/button";

export const SuggestedQueries = ({
  handleSuggestionClick,
}: {
  handleSuggestionClick: (suggestion: string) => void;
}) => {
  const suggestionQueries = [
    {
      desktop: "Show me all different sensors that we have",
      mobile: "All sensors",
    },
    {
      desktop: "show me all our customers and how many sensors they have",
      mobile: "Customer sensor count",
    },
    {
      desktop: "Which sensors are running low in stock?",
      mobile: "Low stock sensors",
    },
    {
      desktop:
        "How many sensors do we have on stock",
      mobile: "Sensors on stock",
    },
    {
      desktop: "What is the total value of all sensors in stock?",
      mobile: "Total value",
    },
    {
      desktop:
        "how many components do we need to build 1 SMC30",
      mobile: "Components for SMC30",
    },

  ];

  return (
    <motion.div
      key="suggestions"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      layout
      exit={{ opacity: 0 }}
      className="h-full overflow-y-auto"
    >
      <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4">
        Try these queries:
      </h2>
      <div className="flex flex-wrap gap-2">
        {suggestionQueries.map((suggestion, index) => (
          <Button
            key={index}
            className={index > 5 ? "hidden sm:inline-block" : ""}
            type="button"
            variant="outline"
            onClick={() => handleSuggestionClick(suggestion.desktop)}
          >
            <span className="sm:hidden">{suggestion.mobile}</span>
            <span className="hidden sm:inline">{suggestion.desktop}</span>
          </Button>
        ))}
      </div>
    </motion.div>
  );
};
