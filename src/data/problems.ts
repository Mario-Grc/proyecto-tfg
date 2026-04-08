export interface ProblemDefinition {
    id: string;
    title: string;
    difficulty: "Facil" | "Media" | "Dificil";
    topic: string;
    statement: string;
}

export const PROBLEM_CATALOG: ProblemDefinition[] = [
    {
        id: "two-sum",
        title: "Two Sum",
        difficulty: "Facil",
        topic: "Arrays",
        statement:
            "Dado un array de enteros nums y un entero target, devuelve los indices de dos numeros tales que su suma sea target. Puedes asumir que existe exactamente una solucion y no puedes usar el mismo elemento dos veces.\n\nEjemplo:\nEntrada: nums = [2, 7, 11, 15], target = 9\nSalida: [0, 1]\nExplicacion: nums[0] + nums[1] = 2 + 7 = 9.",
    },
    {
        id: "valid-parentheses",
        title: "Valid Parentheses",
        difficulty: "Facil",
        topic: "Stack",
        statement:
            "Dada una cadena con caracteres '(', ')', '{', '}', '[' y ']', determina si es valida. Una cadena es valida si los cierres respetan orden y tipo.\n\nEjemplo:\nEntrada: s = \"()[]{}\"\nSalida: true\nExplicacion: todos los simbolos abiertos se cierran en el orden correcto.",
    },
    {
        id: "longest-substring-no-repeat",
        title: "Longest Substring Without Repeating Characters",
        difficulty: "Media",
        topic: "Sliding Window",
        statement:
            "Dada una cadena s, encuentra la longitud de la subcadena mas larga sin caracteres repetidos.\n\nEjemplo:\nEntrada: s = \"abcabcbb\"\nSalida: 3\nExplicacion: la subcadena mas larga sin repetir es \"abc\".",
    },
    {
        id: "merge-intervals",
        title: "Merge Intervals",
        difficulty: "Media",
        topic: "Sorting",
        statement:
            "Dado un conjunto de intervalos [start, end], combina todos los intervalos solapados y devuelve una lista de intervalos no solapados.\n\nEjemplo:\nEntrada: intervals = [[1,3], [2,6], [8,10], [15,18]]\nSalida: [[1,6], [8,10], [15,18]]\nExplicacion: [1,3] y [2,6] se solapan, por eso se fusionan en [1,6].",
    },
];
