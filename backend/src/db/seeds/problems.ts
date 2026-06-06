import type Database from "better-sqlite3";

type SeedDifficulty = "Facil" | "Media" | "Dificil";

interface ProblemSeed {
  id: string;
  title: string;
  difficulty: SeedDifficulty;
  topic: string;
  statement: string;
  source: "seed";
  function_name: string;
  test_cases: string;
}

const PROBLEM_SEED: ProblemSeed[] = [
  {
    id: "two-sum",
    title: "Two Sum",
    difficulty: "Facil",
    topic: "Arrays",
    source: "seed",
    function_name: "twoSum",
    test_cases: JSON.stringify([
      { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { input: [[3, 2, 4], 6], expected: [1, 2] },
      { input: [[3, 3], 6], expected: [0, 1] },
    ]),
    statement:
      "## Objetivo\n" +
      "Dado un array de enteros `nums` y un entero `target`, devuelve los índices de dos números tales que su suma sea `target`.\n\n" +
      "## Ejemplo\n" +
      "- **Entrada:** `nums = [2, 7, 11, 15]`, `target = 9`\n" +
      "- **Salida esperada:** `[0, 1]`\n" +
      "- **Explicación:** `nums[0] + nums[1] = 2 + 7 = 9`.\n\n" +
      "## Reglas\n" +
      "1. Existe exactamente una solución válida.\n" +
      "2. No puedes usar el mismo elemento dos veces.\n" +
      "3. Puedes devolver los índices en cualquier orden.",
  },
  {
    id: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "Facil",
    topic: "Stack",
    source: "seed",
    function_name: "isValid",
    test_cases: JSON.stringify([
      { input: ["()"], expected: true },
      { input: ["()[]{}"], expected: true },
      { input: ["(]"], expected: false },
      { input: ["([)]"], expected: false },
      { input: ["{[]}"], expected: true },
    ]),
    statement:
      "## Objetivo\n" +
      "Dada una cadena `s` con caracteres `()[]{}`, determina si es válida.\n\n" +
      "Una cadena es válida si:\n" +
      "1. Todo símbolo abierto se cierra.\n" +
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
    source: "seed",
    function_name: "lengthOfLongestSubstring",
    test_cases: JSON.stringify([
      { input: ["abcabcbb"], expected: 3 },
      { input: ["bbbbb"], expected: 1 },
      { input: ["pwwkew"], expected: 3 },
      { input: [""], expected: 0 },
    ]),
    statement:
      "## Objetivo\n" +
      "Dada una cadena `s`, encuentra la longitud de la subcadena más larga sin caracteres repetidos.\n\n" +
      "## Ejemplo\n" +
      "- **Entrada:** `s = \"abcabcbb\"`\n" +
      "- **Salida esperada:** `3`\n" +
      "- **Explicación:** la subcadena más larga sin repetir es `\"abc\"`.",
  },
  {
    id: "merge-intervals",
    title: "Merge Intervals",
    difficulty: "Media",
    topic: "Sorting",
    source: "seed",
    function_name: "mergeIntervals",
    test_cases: JSON.stringify([
      { input: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] },
      { input: [[[1, 4], [4, 5]]], expected: [[1, 5]] },
      { input: [[[1, 4], [2, 3]]], expected: [[1, 4]] },
    ]),
    statement:
      "## Objetivo\n" +
      "Dado un conjunto de intervalos `[start, end]`, combina todos los intervalos solapados y devuelve una lista final de intervalos no solapados.\n\n" +
      "## Ejemplo\n" +
      "- **Entrada:** `intervals = [[1,3], [2,6], [8,10], [15,18]]`\n" +
      "- **Salida esperada:** `[[1,6], [8,10], [15,18]]`\n" +
      "- **Explicación:** `[1,3]` y `[2,6]` se solapan, por eso se fusionan en `[1,6]`.\n\n" +
      "## Nota\n" +
      "Suele ser útil ordenar primero por el inicio de cada intervalo.",
  },
  {
    id: "trapping-rain-water",
    title: "Trapping Rain Water",
    difficulty: "Dificil",
    topic: "Two Pointers",
    source: "seed",
    function_name: "trap",
    test_cases: JSON.stringify([
      { input: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expected: 6 },
      { input: [[4, 2, 0, 3, 2, 5]], expected: 9 },
      { input: [[1, 0, 1]], expected: 1 },
      { input: [[3, 0, 2, 0, 4]], expected: 7 },
      { input: [[0]], expected: 0 },
    ]),
    statement:
      "## Objetivo\n" +
      "Dado un array de enteros no negativos `height` que representa la altura de una serie de columnas, calcula cuánta agua puede quedar atrapada entre ellas tras una lluvia.\n\n" +
      "## Ejemplo\n" +
      "- **Entrada:** `height = [0,1,0,2,1,0,1,3,2,1,2,1]`\n" +
      "- **Salida esperada:** `6`\n" +
      "- **Explicación:** las columnas forman valles que retienen agua. La cantidad total atrapada es 6 unidades.\n\n" +
      "## Nota\n" +
      "Para cada posición, la cantidad de agua que puede acumularse depende de las columnas más altas a su izquierda y a su derecha.",
  },
];

export function seedProblems(db: Database.Database): number {
  const upsertStatement = db.prepare(`
    INSERT INTO problems (id, title, difficulty, topic, statement, source,
                          function_name, test_cases,
                          created_at, updated_at)
    VALUES (@id, @title, @difficulty, @topic, @statement, @source,
            @function_name, @test_cases,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      difficulty = excluded.difficulty,
      topic = excluded.topic,
      statement = excluded.statement,
      source = excluded.source,
      function_name = excluded.function_name,
      test_cases = excluded.test_cases,
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
