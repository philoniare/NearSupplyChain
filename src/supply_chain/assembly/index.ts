import {Context} from "near-sdk-core";
import {ContractPromiseBatch, PersistentMap, u128} from "near-sdk-as";
import {ItemState, Product} from "./model";
import {AccountId, XCC_GAS} from "../../utils";

@nearBindgen
export class SupplyChainContract {
  private skuIndex: i32;
  private upcIndex: i32;
  private products: PersistentMap<i32, Product> = new PersistentMap<i32, Product>("m");

  constructor() {
    this.skuIndex = 1;
    this.upcIndex = 1;
  }

  getProducts(): PersistentMap<i32, Product> {
    return this.products;
  }

  /*
     Allows a farmer to mark an item 'Harvested'
   */
  @mutateState()
  harvestItem(upc: i32, originFarmerID: AccountId, originFarmerName: string, originFarmInformation: string,
              originFarmLatitude: string, originFarmLongitude: string, productNotes: string): void {
    // Create a new product and push to the persistent map
    const product = new Product(
      this.skuIndex,
      upc,
      originFarmerID,
      originFarmerName,
      originFarmInformation,
      originFarmLatitude,
      originFarmLongitude,
      productNotes,
    );
    this.products.set(upc, product);
    this.skuIndex++;
  }

  /*
    Allows a farmer to mark an item 'Processed'
   */
  @mutateState()
  processItem(upc: i32): void {
    let product = this.products.get(upc);
    assert(product !== null, "Product with upc doesn't exist");
    assert(product!.itemState === ItemState.Harvested,
        "Product can only be processed when it's in harvested state");
    assert(this.verifyCaller(product!.originFarmerID), "Only the harvested farmer can process this product");

    product!.itemState = ItemState.Processed;

    this.products.set(upc, product!);
  }

  /*
     Allows a farmer to mark an item 'Packed'
   */
  @mutateState()
  packItem(upc: i32): void {
    let product = this.products.get(upc);
    assert(product !== null, "Product with upc doesn't exist");
    assert(product!.itemState === ItemState.Processed,
        "Product can only be packed when it's in processed state");
    assert(this.verifyCaller(product!.originFarmerID), "Only the harvested farmer can pack this product");

    product!.itemState = ItemState.Packed;

    this.products.set(upc, product!);
  }

  /*
    Allows a farmer to mark an item 'ForSale'
   */
  @mutateState()
  sellItem(upc: i32, price: u128): void {
    let product = this.products.get(upc);
    assert(product !== null, "Product with upc doesn't exist");
    assert(product!.itemState === ItemState.Packed,
        "Product can only be put for sale when it's in packed state");
    assert(this.verifyCaller(product!.originFarmerID), "Only the harvested farmer can sell this product");

    product!.itemState = ItemState.ForSale;
    product!.productPrice = price;

    this.products.set(upc, product!);
  }

  /*
    Allows the distributor to mark an item 'Sold'

   */
  @mutateState()
  buyItem(upc: i32): void {
    let product = this.products.get(upc);
    assert(product !== null, "Product with upc doesn't exist");
    assert(product!.itemState === ItemState.ForSale,
        "Product can only be processed when it's in for sale state");
    assert(Context.attachedDeposit >= product!.productPrice,
        'Attached amount is less than product sale price');
    product!.itemState = ItemState.ForSale;

    // Transfer money to farmer who sold the product
    const to_farmer = ContractPromiseBatch.create(product!.originFarmerID);
    to_farmer.transfer(product!.productPrice);

    // Update product metadata
    product!.itemState = ItemState.Sold;
    product!.ownerID = Context.sender;
    product!.distributorID = Context.sender;
    this.products.set(upc, product!);

    to_farmer.then(Context.sender).function_call("on_payout_complete", "{}", u128.Zero, XCC_GAS);
  }

  /*
    Allows the distributor to mark an item 'Shipped'
   */
  @mutateState()
  shipItem(upc: i32): void {
    let product = this.products.get(upc);
    assert(product !== null, "Product with upc doesn't exist");
    assert(product!.itemState === ItemState.Sold,
        "Product can only be shipped when it's in sold state");
    assert(this.verifyCaller(product!.distributorID), "Only the bought distributor can ship this product");

    product!.itemState = ItemState.Shipped;

    this.products.set(upc, product!);
  }

  /*
    Allows the retailer to mark an item 'Received'
   */
  @mutateState()
  receiveItem(upc: i32): void {
    let product = this.products.get(upc);
    assert(product !== null, "Product with upc doesn't exist");
    assert(product!.itemState === ItemState.Shipped,
        "Product can only be received when it's in shipped state");

    product!.itemState = ItemState.Received;
    product!.retailerID = Context.sender;
    product!.ownerID = Context.sender;

    this.products.set(upc, product!);
  }

  /*
    Allows the consumer to mark an item 'Purchased'
   */
  @mutateState()
  purchaseItem(upc: i32): void {
    let product = this.products.get(upc);
    assert(product !== null, "Product with upc doesn't exist");
    assert(product!.itemState === ItemState.Received,
        "Product can only be purchased when it's in received state");
    assert(this.verifyCaller(product!.retailerID), "Only the received retailer can process this product");

    product!.itemState = ItemState.Purchased;
    product!.consumerID = Context.sender;
    product!.ownerID = Context.sender;

    this.products.set(upc, product!);
  }

  private verifyCaller(callerId: AccountId): boolean {
    return Context.sender !== callerId;
  }
}
