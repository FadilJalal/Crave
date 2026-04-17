
const extractQuantityFromName = (name = "") => {
    const text = name.toLowerCase().trim();
    if (!text) return 1;

    // Pattern 1: Look for numbers associated with units (20pcs, 15-piece, 10 units, 6 nuggets)
    // Supports dash separators and singular/plural units
    const match = text.match(/(\d+(?:\.\d+)?)\s*[-]*\s*(?:pcs|pieces?|pc|units?|items?|counts?|sticks?|nuggets?|wings?|buckets?|portions?|strips?|slices?|pcs\.)\b/);
    if (match && match[1]) {
        const val = parseFloat(match[1]);
        return val > 0 ? val : 1;
    }

    // Pattern 2: Look for numbers in parentheses like "(20)" or "[15]" near the end
    const parenMatch = text.match(/[\(\[](\d+)[\)\]]\s*$/);
    if (parenMatch && parenMatch[1]) {
        return parseFloat(parenMatch[1]) || 1;
    }

    // Pattern 3: Fallback - check for leading numbers followed by a space (6 Nugget, 2 Pizza)
    const leadingMatch = text.match(/^(\d+)\s/);
    if (leadingMatch && leadingMatch[1]) {
        return parseFloat(leadingMatch[1]) || 1;
    }

    return 1;
};

console.log("20pcs Loaded Bucket:", extractQuantityFromName("20pcs Loaded Bucket"));
console.log("15 PC Strips:", extractQuantityFromName("15 PC Strips"));
console.log("16pcs Loaded Bucket:", extractQuantityFromName("16pcs Loaded Bucket"));
console.log("12pcs Loaded Bucket:", extractQuantityFromName("12pcs Loaded Bucket"));
console.log("1-piece Chicken:", extractQuantityFromName("1-piece Chicken"));
console.log("Chicken (10):", extractQuantityFromName("Chicken (10)"));
