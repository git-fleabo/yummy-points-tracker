export const avatarColourOptions = [
  { value: "ocean", label: "Ocean" },
  { value: "sky", label: "Sky" },
  { value: "violet", label: "Violet" },
  { value: "coral", label: "Coral" },
  { value: "amber", label: "Amber" },
  { value: "leaf", label: "Leaf" },
  { value: "soft-yellow", label: "Sunshine" },
];

export function getAvatarColourClass(colour: string | null) {
  switch (colour) {
    case "ocean":
      return "bg-blue-600 text-white ring-2 ring-blue-200";
    case "mint":
    case "leaf":
      return "bg-emerald-500 text-white ring-2 ring-emerald-200";
    case "sky":
      return "bg-sky-400 text-sky-950 ring-2 ring-sky-100";
    case "pink":
    case "coral":
      return "bg-rose-500 text-white ring-2 ring-rose-200";
    case "lavender":
    case "violet":
      return "bg-violet-500 text-white ring-2 ring-violet-200";
    case "amber":
      return "bg-amber-400 text-amber-950 ring-2 ring-amber-100";
    case "soft-yellow":
    default:
      return "bg-sunshine text-sunshine-foreground ring-2 ring-sunshine/50";
  }
}
