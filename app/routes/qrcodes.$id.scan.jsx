import {  redirect } from "@remix-run/node";
import db from "../db.server";
import invariant from "tiny-invariant";
import { getQRDestination } from "../models/QRCode.server";

export async function loader({ request, params }) {
  invariant(params.id, "Id is required");

  const qrCode = await db.qRCode.update({
    where: {
      id:Number(params.id),
    },
    data:{
        scans:{increment:1}
    },
  });
  invariant(qrCode,"Valid QR Code not found")

  const url=getQRDestination(qrCode)
  return redirect(url)
}
