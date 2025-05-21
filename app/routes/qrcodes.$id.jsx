import { data } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";
import db from "../db.server";
import { getQRImage } from "../models/QRCode.server";
import styles from "./_index/styles.module.css"

export async function loader({ request, params }) {
  invariant(params.id, "QR code id is required");
  const qrCode = await db.qRCode.findFirst({
    where: {
      id: Number(params.id),
    },
  });
  invariant(qrCode, "Could not find QR Code");
  return data({
    title: qrCode.title,
    image: await getQRImage(qrCode),
  });
}

export default function Index() {
  const { title, image } = useLoaderData().data || { title: "", image: "" };

  return (
    <main className={styles.qrCode_main}>
      <h2>{title}</h2>
      <img src={image} alt={`QR Code for product`} />
    </main>
  );
}
