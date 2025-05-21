import { data } from "@remix-run/node";
import { useLoaderData, Link, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
    Card,
    EmptyState,
    Icon,
    IndexTable,
    Thumbnail,
    Layout,
    Page,
    InlineStack,
    Text
} from "@shopify/polaris";
import { getQRCodes } from "../models/QRCode.server";
import { AlertDiamondIcon,ImageIcon } from "@shopify/polaris-icons";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;
  const qrCodes = await getQRCodes(shop, admin.graphql);

  return data({
    qrCodes,
  });
}

function truncate(str, { length = 26 } = {}) {
  if (!str) return "";
  if (str.length > length) {
    return str.slice(0, length) + "...";
  }
  return str;
}
function EmptyQRCodeState({ onAction }) {
  return (
    <EmptyState
      heading="Create unique QR codes for your products"
      action={{
        content: "Create QR code",
        onAction: onAction,
      }}
      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
    >
      <p>Allow customers to scan codes and buy products using their phones.</p>
    </EmptyState>
  );
}

function QRCodeTable({ qrCodes }) {
  return (
    <IndexTable
      resourceName={{
        singular: "QR Code",
        plural: "QR Codes",
      }}
      itemCount={qrCodes.length}
      headings={[
        { title: "Thumbnail", hidden: true },
        { title: "Title" },
        { title: "Product" },
        { title: "Date Created" },
        { title: "Scans" },
      ]}
    >
      {qrCodes.map((qrCode) => (
        <QRCodeTableRow key={qrCode.id} qrCode={qrCode} />
      ))}
    </IndexTable>
  );
}

function QRCodeTableRow({ qrCode }) {
  return (
    <IndexTable.Row id={qrCode.id} position={qrCode.id}>
      <IndexTable.Cell>
        <Thumbnail
          source={qrCode.productImage || ImageIcon}
          alt={qrCode.title}
          size="small"
        />
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Link to={`qrcodes/${qrCode.id}`}>{truncate(qrCode.title)}</Link>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {qrCode.productDeleted ? (
          <InlineStack>
            <span style={{ width: "200px" }}>
              <Icon source={AlertDiamondIcon}></Icon>
            </span>
            <Text>Product has been deleted</Text>
          </InlineStack>
        ) : (
          truncate(qrCode.productTitle)
        )}
      </IndexTable.Cell>
      <IndexTable.Cell>
        {new Date(qrCode.createdAt).toDateString()}
      </IndexTable.Cell>
      <IndexTable.Cell>{qrCode.scans}</IndexTable.Cell>
    </IndexTable.Row>
  );
}

export default function Index() {
  const { qrCodes } = useLoaderData().data || {qrCodes: []};
  const navigate = useNavigate();

  return (
    <Page>
      <ui-title-bar title="QR codes">
        <button variant="primary" onClick={() => navigate("/app/qrcodes/new")}>
          Create QR code
        </button>
      </ui-title-bar>
      <Layout>
        <Layout.Section>
          <Card padding="0">
            {qrCodes.length === 0 ? (
              <EmptyQRCodeState onAction={() => navigate("qrcodes/new")} />
            ) : (
              <QRCodeTable qrCodes={qrCodes} />
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
