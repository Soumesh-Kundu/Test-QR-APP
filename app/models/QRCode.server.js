import db from "../db.server";
import qrcode from "qrcode";
import invarient from "tiny-invariant";

export async function getQRCode(id,graphql){
  try{
    const qrCode=await db.qRCode.findFirst({
      where:{
        id
      }
    })
    
    return supplementQRcode(qrCode,graphql)
  }
  catch(error){
    console.log(error)
    return {}
  }
}

export async function getQRCodes(shop,graphql){
  const qrCodes=await db.qRCode.findMany({
    where:{
      shop
    },
    orderBy:{
      id:"desc"
    }
  })

  if(qrCodes.length===0) return []
  const qrCodeList=await Promise.all(qrCodes.map((qrCode)=>{
    return supplementQRcode(qrCode,graphql)
  }))

  return qrCodeList;
}

export  function getQRImage(qrCode){
  const url=new URL(`qrcodes/${qrCode.id}/scan`,process.env.SHOPIFY_APP_URL)
  return qrcode.toDataURL(url.href)
}

export function getQRDestination(qrCode){
  if (qrCode.destination==="product"){
    return `https://${qrCode.shop}/products/${qrCode.productHandle}`
  }

  const match = /gid:\/\/shopify\/ProductVariant\/([0-9]+)/.exec(qrCode.productVariantId)

  invarient(match, "Product variant id is not valid")

  return `https://${qrCode.shop}/cart/${match[1]}:1`
}

async function supplementQRcode(qrCode,graphql){
  const qrCodeImagePromise=getQRImage(qrCode)

  const res=await graphql(`
    query supplementQRCode($id: ID!) {
      product(id: $id) {
        title
        images(first: 1) {
          nodes{
            altText
            url
          }
        }
      }
    }
  `,{
    variables:{
      id:qrCode.productId
    }
  })

  const {data:{product}}=await res.json();

  const productURL=product?.images?.nodes[0]?.url
  const productAlt=product?.images?.nodes[0]?.altText
  return{
    ...qrCode,
    productImage:productURL,
    productAlt:productAlt,
    data:product,
    productTitle:product?.title,
    productDeleted:!product?.title,
    destinationUrl:getQRDestination(qrCode),
    image: await qrCodeImagePromise
  }
}


export function validateQRCode(data){
  const errors={}

  if(!data.title){
    errors.title="Title is required"
  }

  if(!data.productId){
    errors.productId="Product is required"
  }

  if(!data.destination){
    errors.destination="Destination is required"
  }

  if(Object.keys(errors).length>0){
    return errors;
  }

  return null;
}