/// <reference types="vite/client" />

// Declaración manual de ImportMeta para Vite (en caso de que vite/client no se resuelva)
interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    // más variables de entorno según sea necesario
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

// Declaración para importar archivos de imagen
declare module '*.png' {
    const src: string;
    export default src;
}

declare module '*.jpg' {
    const src: string;
    export default src;
}

declare module '*.jpeg' {
    const src: string;
    export default src;
}

declare module '*.svg' {
    const src: string;
    export default src;
}

declare module '*.gif' {
    const src: string;
    export default src;
}
