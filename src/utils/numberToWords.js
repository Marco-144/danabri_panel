/**
 * Convierte un número a palabras en español
 * Soporta números hasta millones
 * @param {number} num - Número a convertir
 * @returns {string} Número expresado en palabras
 */
export function numberToWords(num) {
    if (num === 0) return "Cero";

    const unidades = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
    const decenas = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
    const especiales = ["diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve"];
    const centenas = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

    function convertirGrupo(n) {
        if (n === 0) return "";
        if (n < 10) return unidades[n];
        if (n < 20) return especiales[n - 10];
        if (n < 100) {
            const d = Math.floor(n / 10);
            const u = n % 10;
            return u === 0 ? decenas[d] : decenas[d] + " y " + unidades[u];
        }
        const c = Math.floor(n / 100);
        const resto = n % 100;
        const centena = centenas[c];
        return resto === 0 ? centena : centena + " " + convertirGrupo(resto);
    }

    // Parte entera
    const parteEntera = Math.floor(num);
    if (parteEntera === 0) return "Cero";

    let resultado = "";

    // Millones
    if (parteEntera >= 1000000) {
        const millones = Math.floor(parteEntera / 1000000);
        resultado += millones === 1 ? "un millón" : convertirGrupo(millones) + " millones";
        const resto = parteEntera % 1000000;
        if (resto > 0) {
            resultado += " " + convertirGrupo(resto);
        }
    } else {
        resultado = convertirGrupo(parteEntera);
    }

    // Capitalizar primera letra
    resultado = resultado.charAt(0).toUpperCase() + resultado.slice(1);

    return resultado;
}
