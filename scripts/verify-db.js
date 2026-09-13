import { supabase } from '../backend/src/config/supabaseClient.js';

async function verifyDatabase() {
    console.log('================================================================');
    console.log('            PERFUMEHUB DATABASE HEALTH VERIFICATION             ');
    console.log('================================================================');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Supabase URL: ${process.env.SUPABASE_URL || 'MISSING'}`);
    console.log('----------------------------------------------------------------');

    const tables = [
        { name: 'products', label: 'Global Products' },
        { name: 'customers', label: 'Registered Users' },
        { name: 'shops', label: 'Vendor Shops' },
        { name: 'vendor_inventory', label: 'Shop Inventory Items' },
        { name: 'orders', label: 'Customer Orders' },
        { name: 'sub_orders', label: 'Vendor Sub-Orders' },
        { name: 'reservations', label: 'Shop Reservations' },
        { name: 'coupons', label: 'Discount Coupons' },
        { name: 'regions', label: 'Geographic Regions' },
        { name: 'countries', label: 'Supported Countries' },
        { name: 'admin_region_mapping', label: 'Regional Admin Links' },
        { name: 'subscription_plans', label: 'Subscription Plans' },
        { name: 'subscriptions', label: 'Vendor Subscriptions' },
        { name: 'discover_campaigns', label: 'Discover Campaigns' },
        { name: 'banners', label: 'Promotional Banners' },
        { name: 'shipping_rules', label: 'Shipping Rules' },
        { name: 'backups', label: 'Soft-Delete Archives' }
    ];

    let allHealthy = true;
    const summary = [];

    for (const t of tables) {
        try {
            const { count, error } = await supabase
                .from(t.name)
                .select('*', { count: 'exact', head: true });

            if (error) {
                summary.push({ Table: t.name, Description: t.label, Status: 'ERROR', Count: 'N/A', Notes: error.message });
                allHealthy = false;
            } else {
                summary.push({ Table: t.name, Description: t.label, Status: 'ONLINE', Count: count ?? 0, Notes: 'Healthy' });
            }
        } catch (err) {
            summary.push({ Table: t.name, Description: t.label, Status: 'FAILED', Count: 'N/A', Notes: err.message });
            allHealthy = false;
        }
    }

    console.table(summary);
    console.log('================================================================');
    if (allHealthy) {
        console.log('SUCCESS: All database tables are accessible and operational.');
    } else {
        console.log('WARNING: Some tables could not be queried. Check errors above.');
    }
    console.log('================================================================\n');

    process.exit(allHealthy ? 0 : 1);
}

verifyDatabase();



