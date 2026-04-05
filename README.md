# TFG - Ayudante de aprendizaje (nombre provisional)
**Actualmente en desarrollo ...**

Aplicación web para practicar problemas de programación con tres elementos principales:
- editor de código
- chat con LLM local (LM Studio)
- ejecución JS básica

Esta aplicación implementa un entorno de apoyo al aprendizaje de programación basado en práctica guiada. El usuario selecciona un problema, desarrolla su solución en el editor, consulta dudas al asistente LLM local y valida su razonamiento mediante ejecución JavaScript básica.

Además, el entorno cuenta con un compañero interactivo (un **pato de goma virtual**) que reacciona a tus acciones de forma dinámica. Dependiendo de si estás pensando un problema, ejecutando código o hablando por el chat, el pato cambiará su estado y expresiones para acompañarte, haciendo la experiencia de aprendizaje (y el famoso *Rubber Duck Debugging*) mucho más amena visualmente.

### Landing

![Landing](./public/capturas/landing.png)

### Workspace

![Workspace](./public/capturas/workspace.png)

## Stack

- React 19 + TypeScript + Vite
- CodeMirror 6
- React Markdown + rehype-highlight
- LM Studio API compatible (`/v1/chat/completions`)

## Instalación y ejecución
Para ejecutar el proyecto en tu máquina, sigue estos pasos:

1. Clonar el repositorio:
    ```bash
    git clone https://github.com/Mario-Grc/proyecto-tfg.git
    cd proyecto-tfg
    ```

2. Configurar LM Studio:
    *   Descarga e instala [LM Studio](https://lmstudio.ai/).
    *   Descarga el modelo que desees utilizar dentro de LM Studio.
    *   Ve a la pestaña de "Local Server" (Servidor Local).
    *   Selecciona el modelo descargado en la parte superior de la pestaña.
    *   Inicia el servidor (Start Server). Por defecto suele correr en `http://localhost:1234`.
    *   En server settings activa la opción `enable CORS`.

3. Instalar dependencias:
    Con [Node.js](https://nodejs.org/) instalado, ejecuta:
    ```bash
    npm install
    ```

4. Ejecutar la aplicación:
    ```bash
    npm run dev
    ```

## Autor
Mario García Abellán
