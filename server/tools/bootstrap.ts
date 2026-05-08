import { register } from "./index";
import { lookupExtensions } from "./lookupExtensions";
import { validateExtension } from "./validateExtension";
import { searchPriorDemos } from "./searchPriorDemos";
import { estimateInfraCost } from "./estimateInfraCost";
import { generateCFTemplate } from "./generateCFTemplate";
import { generateSchema } from "./generateSchema";
import { generateAppCode } from "./generateAppCode";
import { generateModules } from "./generateModules";

let booted = false;

export function ensureToolsRegistered(): void {
  if (booted) return;
  register(lookupExtensions);
  register(validateExtension);
  register(searchPriorDemos);
  register(estimateInfraCost);
  register(generateCFTemplate);
  register(generateSchema);
  register(generateAppCode);
  register(generateModules);
  booted = true;
}
