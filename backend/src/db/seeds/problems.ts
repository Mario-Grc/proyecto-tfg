import type Database from "better-sqlite3";

type SeedDifficulty = "Facil" | "Media" | "Dificil";

interface ProblemSeed {
  id: string;
  title: string;
  difficulty: SeedDifficulty;
  topic: string;
  statement: string;
}

const PROBLEM_SEED: ProblemSeed[] = [
  {
    id: "two-sum",
    title: "Two Sum",
    difficulty: "Facil",
    topic: "Arrays",
    statement:
      "## Objetivo\n" +
      "Dado un array de enteros `nums` y un entero `target`, devuelve los indices de dos numeros tales que su suma sea `target`.\n\n" +
      "## Ejemplo\n" +
      "- **Entrada:** `nums = [2, 7, 11, 15]`, `target = 9`\n" +
      "- **Salida esperada:** `[0, 1]`\n" +
      "- **Explicacion:** `nums[0] + nums[1] = 2 + 7 = 9`.\n\n" +
      "## Reglas\n" +
      "1. Existe exactamente una solucion valida.\n" +
      "2. No puedes usar el mismo elemento dos veces.\n" +
      "3. Puedes devolver los indices en cualquier orden.",
  },
  {
    id: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "Facil",
    topic: "Stack",
    statement:
      "## Objetivo\n" +
      "Dada una cadena `s` con caracteres `()[]{}`, determina si es valida.\n\n" +
      "Una cadena es valida si:\n" +
      "1. Todo simbolo abierto se cierra.\n" +
      "2. Los cierres respetan el orden correcto.\n" +
      "3. El tipo del cierre coincide con el de apertura.\n\n" +
      "## Ejemplos\n" +
      "| Entrada | Salida |\n" +
      "| --- | --- |\n" +
      "| `s = \"()[]{}\"` | `true` |\n" +
      "| `s = \"(]\"` | `false` |\n\n" +
      "## Pista\n" +
      "Una pila (stack) suele ser la estructura natural para este problema.",
  },
  {
    id: "longest-substring-no-repeat",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Media",
    topic: "Sliding Window",
    statement:
      "## Objetivo\n" +
      "Dada una cadena `s`, encuentra la longitud de la subcadena mas larga sin caracteres repetidos.\n\n" +
      "## Ejemplo\n" +
      "- **Entrada:** `s = \"abcabcbb\"`\n" +
      "- **Salida esperada:** `3`\n" +
      "- **Explicacion:** la subcadena mas larga sin repetir es `\"abc\"`.\n\n" +
      "## Restricciones orientativas\n" +
      "- `0 <= s.length <= 5 * 10^4`\n" +
      "- `s` puede contener letras, numeros, simbolos y espacios.",
  },
  {
    id: "merge-intervals",
    title: "Merge Intervals",
    difficulty: "Media",
    topic: "Sorting",
    statement:
      "## Objetivo\n" +
      "Dado un conjunto de intervalos `[start, end]`, combina todos los intervalos solapados y devuelve una lista final de intervalos no solapados.\n\n" +
      "## Ejemplo\n" +
      "- **Entrada:** `intervals = [[1,3], [2,6], [8,10], [15,18]]`\n" +
      "- **Salida esperada:** `[[1,6], [8,10], [15,18]]`\n" +
      "- **Explicacion:** `[1,3]` y `[2,6]` se solapan, por eso se fusionan en `[1,6]`.\n\n" +
      "## Nota\n" +
      "Suele ser util ordenar primero por el inicio de cada intervalo.",
  },
];

export function seedProblems(db: Database.Database): number {
  const upsertStatement = db.prepare(`
    INSERT INTO problems (id, title, difficulty, topic, statement, created_at, updated_at)
    VALUES (@id, @title, @difficulty, @topic, @statement, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      difficulty = excluded.difficulty,
      topic = excluded.topic,
      statement = excluded.statement,
      updated_at = CURRENT_TIMESTAMP
  `);

  const upsertMany = db.transaction((items: ProblemSeed[]) => {
    for (const problem of items) {
      upsertStatement.run(problem);
    }
  });

  upsertMany(PROBLEM_SEED);

  return PROBLEM_SEED.length;
}
