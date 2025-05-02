/* eslint-disable @typescript-eslint/no-explicit-any */

export function convertIdlToFunctions(idl: any): string {
  if (!idl) {
    throw new Error("IDL is required");
  }

  const programName = idl.name;
  const programId = idl.address || "YOUR_PROGRAM_ID_HERE";

  // Start building the output file
  let output = `import { PublicKey, TransactionInstruction, SystemProgram } from '@solana/web3.js';
  import BN from 'bn.js';
  
  /**
   * Program ID for ${programName}
   */
  export const PROGRAM_ID = new PublicKey('${programId}');
  
  `;

  // Generate account interfaces
  output += generateAccountInterfaces(idl);

  // Generate custom types
  output += generateCustomTypes(idl);

  // Generate instruction interfaces and functions
  output += generateInstructionFunctions(idl);

  return output;
}

/**
 * Generates TypeScript interfaces for program accounts
 */
function generateAccountInterfaces(idl: any): string {
  if (!idl.accounts || idl.accounts.length === 0) {
    return "";
  }

  let output = "// Account Types\n";

  idl.accounts.forEach((account: any) => {
    // Skip accounts without proper structure
    if (!account || !account.name) {
      return;
    }

    const accountName = account.name;
    output += `export interface ${accountName} {\n`;

    // Handle accounts with different structures
    if (
      account.type &&
      account.type.fields &&
      Array.isArray(account.type.fields)
    ) {
      account.type.fields.forEach((field: any) => {
        if (field && field.name) {
          const fieldType = mapSolanaTypeToTs(field.type);
          output += `  ${field.name}: ${fieldType};\n`;
        }
      });
    } else if (account.fields && Array.isArray(account.fields)) {
      // Alternative structure some IDLs might use
      account.fields.forEach((field: any) => {
        if (field && field.name) {
          const fieldType = mapSolanaTypeToTs(field.type);
          output += `  ${field.name}: ${fieldType};\n`;
        }
      });
    } else {
      // For accounts with discriminator only
      output += `  // Account structure details not available in IDL\n`;
      if (account.discriminator) {
        output += `  // Account discriminator: [${account.discriminator.join(
          ", "
        )}]\n`;
      }
    }

    output += "}\n\n";
  });

  return output;
}

/**
 * Generates TypeScript definitions for custom types in the IDL
 */
function generateCustomTypes(idl: any): string {
  if (!idl.types || idl.types.length === 0) {
    return "";
  }

  let output = "// Custom Types\n";

  idl.types.forEach((type: any) => {
    if (!type || !type.name) {
      return;
    }

    if (type.type.kind === "struct") {
      output += generateStructType(type);
    } else if (type.type.kind === "enum") {
      output += generateEnumType(type);
    }
  });

  return output;
}

/**
 * Generates a TypeScript interface for a struct type
 */
function generateStructType(type: any): string {
  let output = `export interface ${type.name} {\n`;

  if (type.type.fields && Array.isArray(type.type.fields)) {
    type.type.fields.forEach((field: any) => {
      if (field && field.name) {
        const fieldType = mapSolanaTypeToTs(field.type);
        output += `  ${field.name}: ${fieldType};\n`;
      }
    });
  }

  output += "}\n\n";
  return output;
}

/**
 * Generates a TypeScript type for an enum
 */
function generateEnumType(type: any): string {
  let output = `export type ${type.name} = `;

  if (type.type.variants && Array.isArray(type.type.variants)) {
    if (type.type.variants.length === 0) {
      output += "never;\n\n";
      return output;
    }

    output += "{\n";

    type.type.variants.forEach((variant: any, index: number) => {
      if (!variant || !variant.name) {
        return;
      }

      output += `  ${variant.name}: `;

      if (!variant.fields || variant.fields.length === 0) {
        output += "{}";
      } else if (Array.isArray(variant.fields)) {
        // Handle different variants of enum fields structure
        if (typeof variant.fields[0] === "object" && variant.fields[0].name) {
          // Named fields
          output += "{\n";
          variant.fields.forEach((field: any) => {
            if (field && field.name) {
              const fieldType = mapSolanaTypeToTs(field.type);
              output += `    ${field.name}: ${fieldType};\n`;
            }
          });
          output += "  }";
        } else {
          // Tuple fields
          output += `[${variant.fields
            .map((field: any) =>
              mapSolanaTypeToTs(typeof field === "object" ? field.type : field)
            )
            .join(", ")}]`;
        }
      } else if (variant.fields.vec) {
        // Vector field
        output += `${mapSolanaTypeToTs(variant.fields.vec)}[]`;
      } else {
        output += "any";
      }

      output += index < type.type.variants.length - 1 ? ";\n" : "\n";
    });

    output += "};\n\n";
  } else {
    output += "any;\n\n";
  }

  return output;
}

/**
 * Maps Solana data types to TypeScript types
 */
function mapSolanaTypeToTs(type: any): string {
  if (type === undefined || type === null) {
    return "any";
  }

  if (typeof type === "string") {
    switch (type) {
      case "u8":
      case "u16":
      case "u32":
      case "i8":
      case "i16":
      case "i32":
        return "number";
      case "u64":
      case "u128":
      case "i64":
      case "i128":
        return "BN";
      case "bool":
        return "boolean";
      case "string":
        return "string";
      case "pubkey":
      case "publicKey":
        return "PublicKey";
      default:
        return type; // Might be a custom type
    }
  } else if (typeof type === "object") {
    if (type.array) {
      const elementType = mapSolanaTypeToTs(type.array[0]);
      const size = type.array[1];
      return size ? `${elementType}[${size}]` : `${elementType}[]`;
    } else if (type.option) {
      const optionType = mapSolanaTypeToTs(type.option);
      return `${optionType} | null`;
    } else if (type.defined) {
      return typeof type.defined === "string"
        ? type.defined
        : type.defined.name || "any";
    } else if (type.vec) {
      const vecType = mapSolanaTypeToTs(type.vec);
      return `${vecType}[]`;
    } else if (type.generic) {
      return `T`; // For generic types
    }
  }

  return "any";
}

/**
 * Generates TypeScript functions for program instructions
 */
function generateInstructionFunctions(idl: any): string {
  if (!idl.instructions || idl.instructions.length === 0) {
    return "";
  }

  let output = "// Instruction Types and Functions\n\n";

  idl.instructions.forEach((instruction: any) => {
    if (!instruction || !instruction.name) {
      return;
    }

    const instructionName = instruction.name;
    const pascalCaseName =
      instructionName.charAt(0).toUpperCase() +
      instructionName
        .slice(1)
        .replace(/_([a-z])/g, (_: unknown, letter: string) =>
          letter.toUpperCase()
        );

    // Generate interface for accounts
    output += `export interface ${pascalCaseName}Accounts {\n`;
    if (instruction.accounts && Array.isArray(instruction.accounts)) {
      instruction.accounts.forEach((account: any) => {
        if (account && account.name) {
          output += `  ${account.name}: PublicKey;\n`;
        }
      });
    }
    output += "}\n\n";

    // Generate interface for args
    if (instruction.args && instruction.args.length > 0) {
      output += `export interface ${pascalCaseName}Args {\n`;
      instruction.args.forEach((arg: any) => {
        if (arg && arg.name) {
          const argType = mapSolanaTypeToTs(arg.type);
          output += `  ${arg.name}: ${argType};\n`;
        }
      });
      output += "}\n\n";
    }

    // Generate instruction function
    output += `/**
   * Creates an instruction to call ${instructionName}
   */
  export function create${pascalCaseName}Instruction(
    accounts: ${pascalCaseName}Accounts,
  ${
    instruction.args && instruction.args.length > 0
      ? `  args: ${pascalCaseName}Args,\n`
      : ""
  }  programId: PublicKey = PROGRAM_ID
  ): TransactionInstruction {
    const keys = [
  ${
    instruction.accounts && Array.isArray(instruction.accounts)
      ? instruction.accounts
          .map((account: any) => {
            if (!account || !account.name) return "";
            return `    { pubkey: accounts.${account.name}, isSigner: ${
              account.isSigner || false
            }, isWritable: ${account.isMut || account.writable || false} },`;
          })
          .join("\n")
      : ""
  }
    ];
  
  ${generateInstructionData(instruction)}
    
    return new TransactionInstruction({
      keys,
      programId,
      data
    });
  }\n\n`;
  });

  return output;
}

/**
 * Generates code to serialize instruction data
 */
function generateInstructionData(instruction: any): string {
  let output = "";

  // Check if the instruction has a discriminator
  if (instruction.discriminator) {
    output += `  // Instruction discriminator
    const discriminator = Buffer.from([${instruction.discriminator.join(
      ", "
    )}]);\n`;
  } else {
    // If no discriminator provided, suggest using an 8-byte hash
    output += `  // Instruction discriminator (you may need to replace this with the actual discriminator)
    const discriminator = Buffer.from("${instruction.name
      .substring(0, 8)
      .padEnd(8, "\0")}", "utf-8");\n`;
  }

  // If no args, just return the discriminator
  if (!instruction.args || instruction.args.length === 0) {
    output += `  const data = discriminator;\n`;
    return output;
  }

  // With args, we need to serialize them
  output += `  
    // Serialize arguments
    const buffers = [discriminator];\n`;

  if (instruction.args && Array.isArray(instruction.args)) {
    instruction.args.forEach((arg: any) => {
      if (arg && arg.name) {
        output += serializeArgument(arg);
      }
    });
  }

  output += `  
    // Concatenate all buffers
    const data = Buffer.concat(buffers);\n`;

  return output;
}

/**
 * Generates code to serialize a specific argument
 */
function serializeArgument(arg: any): string {
  if (!arg || !arg.name) {
    return "";
  }

  const argType =
    typeof arg.type === "string"
      ? arg.type
      : arg.type && arg.type.defined
      ? "defined"
      : arg.type && arg.type.option
      ? "option"
      : "complex";

  let output = "";

  switch (argType) {
    case "u8":
      output += `  // Serialize ${arg.name} (u8)
    const ${arg.name}Buffer = Buffer.alloc(1);
    ${arg.name}Buffer.writeUInt8(args.${arg.name}, 0);
    buffers.push(${arg.name}Buffer);\n`;
      break;
    case "u16":
      output += `  // Serialize ${arg.name} (u16)
    const ${arg.name}Buffer = Buffer.alloc(2);
    ${arg.name}Buffer.writeUInt16LE(args.${arg.name}, 0);
    buffers.push(${arg.name}Buffer);\n`;
      break;
    case "u32":
      output += `  // Serialize ${arg.name} (u32)
    const ${arg.name}Buffer = Buffer.alloc(4);
    ${arg.name}Buffer.writeUInt32LE(args.${arg.name}, 0);
    buffers.push(${arg.name}Buffer);\n`;
      break;
    case "i8":
      output += `  // Serialize ${arg.name} (i8)
    const ${arg.name}Buffer = Buffer.alloc(1);
    ${arg.name}Buffer.writeInt8(args.${arg.name}, 0);
    buffers.push(${arg.name}Buffer);\n`;
      break;
    case "i16":
      output += `  // Serialize ${arg.name} (i16)
    const ${arg.name}Buffer = Buffer.alloc(2);
    ${arg.name}Buffer.writeInt16LE(args.${arg.name}, 0);
    buffers.push(${arg.name}Buffer);\n`;
      break;
    case "i32":
      output += `  // Serialize ${arg.name} (i32)
    const ${arg.name}Buffer = Buffer.alloc(4);
    ${arg.name}Buffer.writeInt32LE(args.${arg.name}, 0);
    buffers.push(${arg.name}Buffer);\n`;
      break;
    case "u64":
    case "i64":
      output += `  // Serialize ${arg.name} (${argType})
    const ${arg.name}Buffer = Buffer.alloc(8);
    args.${arg.name}.toBuffer().copy(${arg.name}Buffer);
    buffers.push(${arg.name}Buffer);\n`;
      break;
    case "u128":
    case "i128":
      output += `  // Serialize ${arg.name} (${argType})
    const ${arg.name}Buffer = Buffer.alloc(16);
    args.${arg.name}.toBuffer().copy(${arg.name}Buffer);
    buffers.push(${arg.name}Buffer);\n`;
      break;
    case "bool":
      output += `  // Serialize ${arg.name} (bool)
    const ${arg.name}Buffer = Buffer.alloc(1);
    ${arg.name}Buffer.writeUInt8(args.${arg.name} ? 1 : 0, 0);
    buffers.push(${arg.name}Buffer);\n`;
      break;
    case "string":
      output += `  // Serialize ${arg.name} (string)
    const ${arg.name}Bytes = Buffer.from(args.${arg.name}, 'utf8');
    const ${arg.name}LenBuffer = Buffer.alloc(4);
    ${arg.name}LenBuffer.writeUInt32LE(${arg.name}Bytes.length, 0);
    buffers.push(${arg.name}LenBuffer);
    buffers.push(${arg.name}Bytes);\n`;
      break;
    case "pubkey":
    case "publicKey":
      output += `  // Serialize ${arg.name} (publicKey)
    buffers.push(args.${arg.name}.toBuffer());\n`;
      break;
    case "option":
      const optionType =
        arg.type && arg.type.option
          ? mapSolanaTypeToTs(arg.type.option)
          : "any";
      output += `  // Serialize ${arg.name} (option<${optionType}>)
    if (args.${arg.name} === null) {
      const optionBuffer = Buffer.alloc(1);
      optionBuffer.writeUInt8(0, 0);
      buffers.push(optionBuffer);
    } else {
      const optionBuffer = Buffer.alloc(1);
      optionBuffer.writeUInt8(1, 0);
      buffers.push(optionBuffer);
      
      // TODO: Add serialization for the specific option type
      // This is a placeholder. You'll need to implement the correct serialization
      // based on the actual type inside the option.
    }\n`;
      break;
    case "defined":
      output += `  // Serialize ${arg.name} (defined type)
    // TODO: Add custom serialization for the defined type
    // This is a placeholder. You'll need to implement the correct serialization
    // for the specific defined type: ${JSON.stringify(arg.type)}
    const ${arg.name}Buffer = Buffer.from([]);
    buffers.push(${arg.name}Buffer);\n`;
      break;
    default:
      output += `  // Serialize ${arg.name} (complex type)
    // NOTE: You'll need to implement custom serialization for this type
    // Type details: ${JSON.stringify(arg.type)}
    const ${arg.name}Buffer = Buffer.from([]);
    buffers.push(${arg.name}Buffer);\n`;
  }

  return output;
}

export function idlToFunctions(idlJson: unknown): string {
  return convertIdlToFunctions(idlJson);
}
