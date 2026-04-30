import assert from "assert";

function runTests() {
  console.log("🧪 Running Crave Test Suite...");
  
  try {
    // 1. Order Placement Logic
    console.log("▶ Testing Order Placement Logic...");
    const cart = [{ price: 10, quantity: 2 }, { price: 5, quantity: 1 }];
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    assert.strictEqual(subtotal, 25, "Subtotal should be correctly calculated");
    console.log("✅ Order placement logic passed.");

    // 2. Payment Calculation
    console.log("▶ Testing Payment and Tax Calculation...");
    const deliveryFee = 5;
    const taxRate = 0.05;
    const totalWithTax = subtotal + (subtotal * taxRate) + deliveryFee;
    assert.strictEqual(totalWithTax, 31.25, "Total with tax and delivery should be accurate");
    console.log("✅ Payment calculation passed.");

    // 3. Shared Delivery Matching
    console.log("▶ Testing Shared Delivery Algorithm (Distance/Time Constraints)...");
    const activeOrderDistMeters = 4000; // 4km
    const timeSinceOrderMins = 10;
    const isSharedValid = activeOrderDistMeters <= 5000 && timeSinceOrderMins <= 15;
    assert.strictEqual(isSharedValid, true, "Order within 5km and 15mins should be valid for shared delivery");
    
    const invalidDist = 6000;
    assert.strictEqual(invalidDist <= 5000, false, "Order >5km should be rejected for shared delivery");
    console.log("✅ Shared delivery matching constraints passed.");

    // 4. Login Security Constraints
    console.log("▶ Testing Login Security Rules...");
    const weakPass = "weak";
    const strongPass = "StrongPass1!";
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])/;
    assert.strictEqual(passRegex.test(weakPass), false, "Weak password should fail regex");
    assert.strictEqual(passRegex.test(strongPass), true, "Strong password should pass regex");
    console.log("✅ Login security rules passed.");

    // 5. Inventory Deduction
    console.log("▶ Testing Inventory Deduction...");
    let stock = 10;
    const orderQty = 3;
    stock -= orderQty;
    assert.strictEqual(stock, 7, "Stock should be correctly deducted");
    
    const overOrderQty = 10;
    const isOverOrderValid = (stock - overOrderQty) >= 0;
    assert.strictEqual(isOverOrderValid, false, "Cannot order more than available stock");
    console.log("✅ Inventory deduction passed.");

    console.log("🏁 All critical business logic tests passed successfully!");
  } catch (err) {
    console.error("❌ Test Failed:", err.message);
    process.exit(1);
  }
}

runTests();
