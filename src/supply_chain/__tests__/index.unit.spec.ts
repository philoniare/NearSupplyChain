import {SupplyChainContract} from "../assembly";
import {u128, VMContext} from "near-sdk-as";
import {ONE_NEAR, AccountId} from '../../utils';
import {ItemState} from "../assembly/model";

const attachProductBalance = (): void => {
  VMContext.setAttached_deposit(ONE_NEAR);
};

const setCurrentAccount = (accountId: AccountId): void => {
  VMContext.setSigner_account_id(accountId);
};

let contract: SupplyChainContract

beforeEach(() => {
  contract = new SupplyChainContract()
});

describe("SupplyChainContract", () => {
  const upc = 1
  const originFarmerID = 'farmer'
  const originFarmName = "John Doe"
  const originFarmInformation = "Yarray Valley"
  const originFarmLatitude = "-38.239770"
  const originFarmLongitude = "144.341490"
  const productNotes = "Best beans for Espresso"
  const distributorID = 'distributor'
  const retailerID = 'retailer'
  const consumerID = 'consumer'

  it("allows a farmer to harvest coffee", () => {
    contract.harvestItem(upc, originFarmerID, originFarmName, originFarmInformation, originFarmLatitude,
        originFarmLongitude, productNotes);
    const product = contract.get_products().get(upc);;
    expect(product).not.toBeNull();
    expect(product!.itemState).toBe(ItemState.Harvested, 'new product should be in harvested state');
  });

  it("allows a farmer to process coffee", () => {
    contract.harvestItem(upc, originFarmerID, originFarmName, originFarmInformation, originFarmLatitude,
        originFarmLongitude, productNotes);
    contract.processItem(upc);
    const product = contract.get_products().get(upc);;
    expect(product).not.toBeNull();
    expect(product!.itemState).toBe(ItemState.Processed, 'product state should be processed');
  });

  it("allows a farmer to pack coffee", () => {
    contract.harvestItem(upc, originFarmerID, originFarmName, originFarmInformation, originFarmLatitude,
        originFarmLongitude, productNotes);
    contract.processItem(upc);
    contract.packItem(upc);
    const product = contract.get_products().get(upc);;
    expect(product).not.toBeNull();
    expect(product!.itemState).toBe(ItemState.Packed, 'product state should be packed');
  });

  it("allows a farmer to mark coffee for sale", () => {
    contract.harvestItem(upc, originFarmerID, originFarmName, originFarmInformation, originFarmLatitude,
        originFarmLongitude, productNotes);
    contract.processItem(upc);
    contract.packItem(upc);
    contract.sellItem(upc, ONE_NEAR);
    const product = contract.get_products().get(upc);
    expect(product).not.toBeNull();
    expect(product!.itemState).toBe(ItemState.ForSale, 'product state should be for sale');
    expect(product!.productPrice).toBe(ONE_NEAR, 'product price should be one near');
  });

  it("allows a distributor to buy coffee", () => {
    attachProductBalance();
    setCurrentAccount(distributorID);
    contract.harvestItem(upc, originFarmerID, originFarmName, originFarmInformation, originFarmLatitude,
        originFarmLongitude, productNotes);
    contract.processItem(upc);
    contract.packItem(upc);
    contract.sellItem(upc, ONE_NEAR);
    contract.buyItem(upc);
    const product = contract.get_products().get(upc);
    expect(product).not.toBeNull();
    expect(product!.itemState).toBe(ItemState.Sold, 'product state should be sold');
    expect(product!.distributorID).toBe(distributorID, 'product distributorID should be set correctly');
    expect(product!.ownerID).toBe(distributorID, 'product ownerID should be set correctly');
  });

  it("allows a retailer to mark coffee received", () => {
    attachProductBalance();
    setCurrentAccount(retailerID);
    contract.harvestItem(upc, originFarmerID, originFarmName, originFarmInformation, originFarmLatitude,
        originFarmLongitude, productNotes);
    contract.processItem(upc);
    contract.packItem(upc);
    contract.sellItem(upc, ONE_NEAR);
    contract.buyItem(upc);
    contract.shipItem(upc);
    const product = contract.get_products().get(upc);
    expect(product).not.toBeNull();
    expect(product!.itemState).toBe(ItemState.Shipped, 'product state should be shipped');
  });

  it("allows a retailer to mark coffee received", () => {
    attachProductBalance();
    setCurrentAccount(retailerID);
    contract.harvestItem(upc, originFarmerID, originFarmName, originFarmInformation, originFarmLatitude,
        originFarmLongitude, productNotes);
    contract.processItem(upc);
    contract.packItem(upc);
    contract.sellItem(upc, ONE_NEAR);
    contract.buyItem(upc);
    contract.shipItem(upc);
    contract.receiveItem(upc);
    const product = contract.get_products().get(upc);
    expect(product).not.toBeNull();
    expect(product!.itemState).toBe(ItemState.Received, 'product state should be sold');
    expect(product!.retailerID).toBe(retailerID, 'product retailerID should be set correctly');
    expect(product!.ownerID).toBe(retailerID, 'product ownerID should be set correctly');
  });

  it("allows a consumer to purchase coffee", () => {
    attachProductBalance();
    setCurrentAccount(consumerID);
    contract.harvestItem(upc, originFarmerID, originFarmName, originFarmInformation, originFarmLatitude,
        originFarmLongitude, productNotes);
    contract.processItem(upc);
    contract.packItem(upc);
    contract.sellItem(upc, ONE_NEAR);
    contract.buyItem(upc);
    contract.shipItem(upc);
    contract.receiveItem(upc);
    contract.purchaseItem(upc);
    const product = contract.get_products().get(upc);
    expect(product).not.toBeNull();
    expect(product!.itemState).toBe(ItemState.Purchased, 'product state should be purchased');
    expect(product!.consumerID).toBe(consumerID, 'product consumerID should be set correctly');
    expect(product!.ownerID).toBe(consumerID, 'product ownerID should be set correctly');
  });
});
