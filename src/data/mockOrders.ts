export type Order = {
  id: string;
  customerName: string;
  productName: string;
  quantity: number;
  total: number;
  date: string;
  status: "Processing" | "Shipped" | "Delivered";
};

export const recentOrders: Order[] = [
  { id: "ORD-8923", customerName: "Aarav Sharma", productName: "Himalayan Green Tea", quantity: 2, total: 1398, date: "2026-08-18", status: "Processing" },
  { id: "ORD-8922", customerName: "Priya Patel", productName: "Golden Dusk Black Tea + Chamomile", quantity: 1, total: 899, date: "2026-08-17", status: "Shipped" },
  { id: "ORD-8921", customerName: "Rohan Gupta", productName: "Assam Vintage Reserve", quantity: 3, total: 3297, date: "2026-08-16", status: "Delivered" },
  { id: "ORD-8920", customerName: "Neha Singh", productName: "Darjeeling First Flush", quantity: 1, total: 749, date: "2026-08-15", status: "Delivered" },
  { id: "ORD-8919", customerName: "Vikram Malhotra", productName: "Artisan Oolong", quantity: 2, total: 1998, date: "2026-08-14", status: "Delivered" },
  { id: "ORD-8918", customerName: "Ananya Desai", productName: "Assam Golden Black", quantity: 1, total: 649, date: "2026-08-12", status: "Delivered" },
];

export const salesAnalytics = {
  currentMonthTotal: 124500,
  percentageIncrease: 12.6, // percentage increase from last month
  lastSixMonths: [
    { month: "Mar", sales: 85000 },
    { month: "Apr", sales: 92000 },
    { month: "May", sales: 105000 },
    { month: "Jun", sales: 98000 },
    { month: "Jul", sales: 110500 },
    { month: "Aug", sales: 124500 },
  ]
};
