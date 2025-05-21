import { useState } from "react";
import { data, redirect } from "@remix-run/node";
import styles from "./_index/styles.module.css"
import {
  useNavigation,
  useActionData,
  useSubmit,
  useNavigate,
  useLoaderData,
} from "@remix-run/react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getQRCode, validateQRCode } from "../models/QRCode.server";
import {
  Bleed,
  BlockStack,
  Button,
  Card,
  Divider,
  EmptyState,
  InlineError,
  InlineStack,
  Layout,
  Page,
  PageActions,
  TextField,
  Thumbnail,
  Text,
  ChoiceList,
} from "@shopify/polaris";
import { ImageIcon } from "@shopify/polaris-icons";

export async function loader({ request, params }) {
  const { admin } = await authenticate.admin(request);

  if (params.id === "new") {
    return data({
      destination: "product",
      title: "",
    });
  }

  const qrCodeID = Number(params.id);
  const qrCode = await getQRCode(qrCodeID, admin.graphql);
  return data(qrCode);
}

export async function action({ request, params }) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const { shop } = session;

  const data = {
    ...Object.fromEntries(formData),
    shop,
  };

  if (data.action === "delete") {
    await db.qRCodes.delete({
      where: {
        id: Number(params.id),
      },
    });
    return redirect("/app");
  }

  const errors = validateQRCode(data);
  if (errors) {
    return data(
      {
        errors,
      },
      {
        status: 422,
      },
    );
  }

  console.log("data", data);
  const qrCodeID = params.id !== "new" ? Number(params.id) : 0;
  const qrCode = await db.qRCode.upsert({
    where: {
      id: qrCodeID,
    },
    create: {
      ...data,
    },
    update: {
      ...data,
    },
  });

  return redirect(`/app/qrcodes/${qrCode.id}`);
}

export default function QRCodeForm() {
  const errors = useActionData()?.errors || {};

  const qrCode = useLoaderData().data || {};
  // console.log("qrCode", qrCode);
  const [formState, setFormState] = useState(qrCode);
  const [cleanFormState, setCleanFormState] = useState(qrCode);
  const navigation = useNavigation();
  const isSaving =
    navigation.state === "submitting" &&
    navigation.formData.get("action") !== "delete";
  const isDeleting =
    navigation.state === "submitting" &&
    navigation.formData.get("action") === "delete";
  const isDirty = JSON.stringify(formState) !== JSON.stringify(cleanFormState);
  const navigate = useNavigate();
  const submit = useSubmit();

  async function selectProduct() {
    const products = await window.shopify.resourcePicker({
      type: "product",
      action: "select",
    });

    if (products) {
      const product = products[0];
      console.log(product);
      setFormState({
        ...formState,
        productId: product.id,
        productTitle: product.title,
        productHandle: product.handle,
        productImage: product.images[0]?.originalSrc,
        productAlt: product.images[0]?.altText,
        productVariantId: product.variants[0]?.id,
      });
    }
  }

  function handleSave() {
    const data = {
      title: formState.title,
      productId: formState.productId,
      productHandle: formState.productHandle,
      productVariantId: formState.productVariantId,
      destination: formState.destination,
    };

    console.log("data", data);
    setCleanFormState({ ...formState });
    submit(data, {
      method: "post",
    });
  }

  return (
    <Page>
      <ui-title-bar title={qrCode.id ? "Edit QR Code" : "Add QR Code"}>
        <button variant="breadcrumb" onClick={() => navigate("/app")}>
          QR Codes
        </button>
      </ui-title-bar>
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingLg">
                  Title
                </Text>
                <TextField
                  id="title"
                  label="Title"
                  value={formState.title}
                  labelHidden
                  autoComplete="off"
                  onChange={(value) =>
                    setFormState({ ...formState, title: value })
                  }
                  error={errors.title}
                />
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="500">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingLg">
                    Product
                  </Text>
                  {formState.productId ? (
                    <Button variant="plain" onClick={selectProduct}>
                      Change Product
                    </Button>
                  ) : null}
                </InlineStack>
                {formState.productId ? (
                  <InlineStack blockAlign="center" gap="500">
                    <Thumbnail
                      source={formState.productImage || ImageIcon}
                      alt={formState.productAlt}
                    />
                    <Text as="span" variant="headingMd" fontWeight="semibold">
                      {formState.productTitle}
                    </Text>
                  </InlineStack>
                ) : (
                  <BlockStack gap="500">
                    <Button id="select-product" onClick={selectProduct}>
                      Select Product
                    </Button>
                    {errors.productId ? (
                      <InlineError
                        message={errors.productId}
                        fieldID="myFieldId"
                      />
                    ) : null}
                  </BlockStack>
                )}
                <Bleed marginInlineStart={200} marginInlineEnd={200}>
                  <Divider />
                </Bleed>
                <InlineStack align="space-between">
                  <ChoiceList
                    title="Scan Destination"
                    choices={[
                      { label: "Link to Product Page", value: "product" },
                      { label: "Link to Cart Page", value: "cart" },
                    ]}
                    selected={[formState.destination]}
                    onChange={(value) => {
                      setFormState({
                        ...formState,
                        destination: value[0],
                      });
                    }}
                    error={errors.destination}
                  />
                  {qrCode.destinationUrl && (
                    <Button
                      variant="plain"
                      url={qrCode.destinationUrl}
                      target="_blank"
                    >
                      Go to Destination URL
                    </Button>
                  )}
                </InlineStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <Card>
            <Text as="h2" variant="headingLg">
              QR Code
            </Text>
            {qrCode.image ? (
              <div className={styles.qrCode_image}>
                <img src={qrCode.image} height={200} width={200} />
              </div>
            ) : (
              // <EmptyState image={qrCode.image} imageContained={true}>
              // </EmptyState>
              <EmptyState image="">
                Your QR code will appear here after you save
              </EmptyState>
            )}
            <BlockStack gap="500">
              <Button
                disabled={!qrCode.id}
                url={qrCode.image}
                download
                variant="primary"
              >
                Download
              </Button>
              <Button
                disabled={!qrCode.id}
                url={`/qrcodes/${qrCode.id}`}
                target="_blank"
              >
                Go To public URL
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <PageActions
            secondaryActions={[
              {
                content: "Delete",
                loading: isDeleting,
                disabled: !qrCode.id || !qrCode || isSaving || isDeleting,
                destructive: true,
                outline: true,
                onAction: () => {
                  submit({ action: "delete" }, { method: "post" });
                },
              },
            ]}
            primaryAction={{
              content: "Save",
              loading: isSaving,
              disabled: !isDirty || isSaving || isDeleting,
              onAction: handleSave,
            }}
          />
        </Layout.Section>
      </Layout>
    </Page>
  );
}
