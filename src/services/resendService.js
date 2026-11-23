import {Resend} from "resend";
import {template} from "../templates";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function enviarPostulacion(){
    const {data, error} = await resend.emails.send({
        from: "AquaChile <onboarding@resend.dev>",
        to: ["diegogonzalobarrimartinez1@gmail.com"],
        subject: "Cofirmacion de postulacion - AquaChile",
        html: template,
    });

    if (error) return {error};
    return {data};
}