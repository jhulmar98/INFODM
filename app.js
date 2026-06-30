import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
    getFirestore,
    collection,
    query,
    orderBy,
    startAt,
    endAt,
    limit,
    getDocs,
    getDoc,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";


/* =========================================================
   CONFIGURACION FIREBASE
========================================================= */

const firebaseConfig = {
    apiKey: "AIzaSyD_hz2Y0qajgRMPeb0L3Ky75jQJIebywJM",
    authDomain: "red-de-patas.firebaseapp.com",
    projectId: "red-de-patas",
    storageBucket: "red-de-patas.firebasestorage.app",
    messagingSenderId: "812893065625",
    appId: "1:812893065625:web:08b1c067911872edd14308",
    measurementId: "G-M1NH2DJF29"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);


/* =========================================================
   ELEMENTOS HTML
========================================================= */

const formularioRegistro = document.getElementById(
    "formularioRegistro"
);

const nombreBusquedaInput = document.getElementById(
    "nombreBusqueda"
);

const sugerencias = document.getElementById(
    "sugerencias"
);

const datosPersonal = document.getElementById(
    "datosPersonal"
);

const nombrePersonal = document.getElementById(
    "nombrePersonal"
);

const detallePersonal = document.getElementById(
    "detallePersonal"
);

const fechaInput = document.getElementById("fecha");

const turnoInput = document.getElementById("turno");

const sectorInput = document.getElementById("sector");

const incidenciaInput = document.getElementById(
    "incidencia"
);

const btnGuardar = document.getElementById("btnGuardar");

const mensaje = document.getElementById("mensaje");


/* =========================================================
   VARIABLES GLOBALES
========================================================= */

let personalSeleccionado = null;

let temporizadorBusqueda = null;

let numeroBusqueda = 0;


/* =========================================================
   FECHA ACTUAL
========================================================= */

fechaInput.value = obtenerFechaLocal();


/* =========================================================
   BUSCADOR POR NOMBRE
========================================================= */

nombreBusquedaInput.addEventListener("input", () => {

    limpiarPersonalSeleccionado();

    clearTimeout(temporizadorBusqueda);

    temporizadorBusqueda = setTimeout(() => {

        buscarPersonalPorNombre();

    }, 350);

});


/* =========================================================
   GUARDAR REGISTRO
========================================================= */

formularioRegistro.addEventListener(
    "submit",
    guardarRegistro
);


/* =========================================================
   BUSCAR EN REGISTRO_NOMBRE
========================================================= */

async function buscarPersonalPorNombre() {

    const textoBusqueda = normalizarTexto(
        nombreBusquedaInput.value
    );

    const busquedaActual = ++numeroBusqueda;


    if (textoBusqueda.length < 3) {

        ocultarSugerencias();

        return;

    }


    try {

        const consulta = query(
            collection(db, "registro_nombre"),
            orderBy("apellidos_nombres"),
            startAt(textoBusqueda),
            endAt(textoBusqueda + "\uf8ff"),
            limit(8)
        );

        const resultado = await getDocs(consulta);


        if (busquedaActual !== numeroBusqueda) {
            return;
        }


        const personas = [];


        resultado.forEach((documento) => {

            personas.push({
                id: documento.id,
                ...documento.data()
            });

        });


        mostrarSugerencias(personas);

    } catch (error) {

        console.error(
            "Error al buscar personal:",
            error
        );

        ocultarSugerencias();

        mostrarMensaje(
            "No se pudo buscar el personal.",
            "error"
        );

    }

}


/* =========================================================
   MOSTRAR SUGERENCIAS
========================================================= */

function mostrarSugerencias(personas) {

    sugerencias.innerHTML = "";


    if (personas.length === 0) {

        const sinResultados = document.createElement("div");

        sinResultados.className = "sugerencia-vacia";

        sinResultados.textContent =
            "No se encontró personal con ese nombre.";

        sugerencias.appendChild(sinResultados);

        sugerencias.classList.remove("oculto");

        return;

    }


    personas.forEach((persona) => {

        const boton = document.createElement("button");

        boton.type = "button";

        boton.className = "sugerencia-personal";


        const nombre = document.createElement("strong");

        nombre.textContent =
            persona.apellidos_nombres ||
            "Sin nombre registrado";


        const detalle = document.createElement("small");

        detalle.textContent = [
            `DNI: ${persona.dni || ""}`,
            persona.area || "",
            persona.funcion || ""
        ]
            .filter(Boolean)
            .join(" | ");


        boton.appendChild(nombre);

        boton.appendChild(detalle);


        boton.addEventListener("click", () => {

            seleccionarPersonal(persona);

        });


        sugerencias.appendChild(boton);

    });


    sugerencias.classList.remove("oculto");

}


/* =========================================================
   SELECCIONAR PERSONAL
========================================================= */

function seleccionarPersonal(persona) {

    personalSeleccionado = persona;

    nombreBusquedaInput.value =
        persona.apellidos_nombres || "";

    ocultarSugerencias();

    mostrarDatosPersonal(persona);

    btnGuardar.disabled = false;

    mostrarMensaje(
        "Personal seleccionado. Complete el registro.",
        "ok"
    );

}


/* =========================================================
   GUARDAR EN DESCANSOS_DIARIOS
========================================================= */

async function guardarRegistro(event) {

    event.preventDefault();


    const fecha = fechaInput.value;

    const turno = turnoInput.value;

    const sector = sectorInput.value;

    const incidencia = incidenciaInput.value;


    if (!personalSeleccionado) {

        mostrarMensaje(
            "Busque y seleccione al personal.",
            "error"
        );

        return;

    }


    if (!fecha || !turno || !sector || !incidencia) {

        mostrarMensaje(
            "Complete fecha, turno, sector e incidencia.",
            "error"
        );

        return;

    }


    if (!personalSeleccionado.dni) {

        mostrarMensaje(
            "El personal seleccionado no tiene DNI registrado.",
            "error"
        );

        return;

    }


    btnGuardar.disabled = true;

    btnGuardar.textContent = "Guardando...";


    try {

        const referenciaDia = doc(
            db,
            "descansos_diarios",
            fecha
        );


        await setDoc(
            referenciaDia,
            {
                fecha: fecha,
                actualizado_en: serverTimestamp()
            },
            {
                merge: true
            }
        );


        const referenciaRegistro = doc(
            db,
            "descansos_diarios",
            fecha,
            "registros",
            personalSeleccionado.dni
        );


        const registroExistente = await getDoc(
            referenciaRegistro
        );


        const datosRegistro = {
            dni: personalSeleccionado.dni,

            apellidos_nombres:
                personalSeleccionado.apellidos_nombres || "",

            sexo:
                personalSeleccionado.sexo || "",

            area:
                personalSeleccionado.area || "",

            funcion:
                personalSeleccionado.funcion || "",

            condicion_laboral:
                personalSeleccionado.condicion_laboral || "",

            fecha: fecha,

            turno: turno,

            sector: sector,

            incidencia: incidencia,

            hora_registro: obtenerHoraLima(),

            actualizado_en: serverTimestamp()
        };


        if (!registroExistente.exists()) {

            datosRegistro.creado_en = serverTimestamp();

        }


        await setDoc(
            referenciaRegistro,
            datosRegistro,
            {
                merge: true
            }
        );


        mostrarMensaje(
            registroExistente.exists()
                ? "Registro del día actualizado correctamente."
                : "Registro guardado correctamente.",
            "ok"
        );


        formularioRegistro.reset();

        fechaInput.value = obtenerFechaLocal();

        limpiarPersonalSeleccionado();

        nombreBusquedaInput.focus();

    } catch (error) {

        console.error(
            "Error al guardar el registro:",
            error
        );

        mostrarMensaje(
            "No se pudo guardar el registro. Revise las reglas de Firestore.",
            "error"
        );

    } finally {

        btnGuardar.textContent = "Guardar registro";

        btnGuardar.disabled = true;

    }

}


/* =========================================================
   MOSTRAR DATOS DEL PERSONAL
========================================================= */

function mostrarDatosPersonal(persona) {

    nombrePersonal.textContent =
        persona.apellidos_nombres ||
        "Personal sin nombre registrado";


    const detalle = [

        persona.dni
            ? `DNI: ${persona.dni}`
            : "",

        persona.sexo
            ? `Sexo: ${persona.sexo}`
            : "",

        persona.area || "",

        persona.funcion || ""

    ]
        .filter(Boolean)
        .join(" | ");


    detallePersonal.textContent = detalle;

    datosPersonal.classList.remove("oculto");

}


/* =========================================================
   LIMPIAR PERSONAL
========================================================= */

function limpiarPersonalSeleccionado() {

    personalSeleccionado = null;

    btnGuardar.disabled = true;

    datosPersonal.classList.add("oculto");

    nombrePersonal.textContent = "-";

    detallePersonal.textContent = "-";

}


/* =========================================================
   SUGERENCIAS
========================================================= */

function ocultarSugerencias() {

    sugerencias.innerHTML = "";

    sugerencias.classList.add("oculto");

}


/* =========================================================
   MENSAJES
========================================================= */

function mostrarMensaje(texto, tipo) {

    mensaje.textContent = texto;

    mensaje.className = `mensaje ${tipo}`;

}


/* =========================================================
   TEXTO
========================================================= */

function normalizarTexto(valor) {

    return String(valor || "")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();

}


/* =========================================================
   FECHA Y HORA
========================================================= */

function obtenerFechaLocal() {

    const fecha = new Date();

    const zonaLocal =
        fecha.getTimezoneOffset() * 60000;

    return new Date(
        fecha.getTime() - zonaLocal
    )
        .toISOString()
        .slice(0, 10);

}


function obtenerHoraLima() {

    return new Intl.DateTimeFormat(
        "es-PE",
        {
            timeZone: "America/Lima",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        }
    ).format(new Date());

}
