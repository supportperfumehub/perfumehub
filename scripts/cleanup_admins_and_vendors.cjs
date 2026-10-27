const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/LENOVO/OneDrive/Documents/perfumehub/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runCleanup() {
    console.log('====================================================');
    console.log('PURGING ALL VENDORS, REGIONAL ADMINS & EXTRA ADMINS');
    console.log('ENFORCING SINGLE SUPER ADMIN (supportperfumehub@gmail.com)');
    console.log('====================================================\n');

    // 1. Reassign all shops to the single Super Admin (ID: 40)
    console.log('1. Reassigning shops to Super Admin (ID 40)...');
    const { data: updatedShops, error: shopErr } = await supabase
        .from('shops')
        .update({ owner_id: 40 })
        .neq('owner_id', 40)
        .select('id, name, owner_id');

    if (shopErr) console.error('Shop update error:', shopErr);
    else console.log(`   Updated ${updatedShops?.length || 0} shops to owner_id 40.`);

    // 2. Clear admin_region_mapping (No Regional Admins)
    console.log('\n2. Clearing admin_region_mapping (eliminating all RA assignments)...');
    const { data: deletedMappings, error: mapErr } = await supabase
        .from('admin_region_mapping')
        .delete()
        .neq('admin_id', 0)
        .select();

    if (mapErr) console.error('Map delete error:', mapErr);
    else console.log(`   Deleted ${deletedMappings?.length || 0} regional admin mappings.`);

    // 3. Clear vendor_id in sub_orders
    console.log('\n3. Clearing vendor_id in sub_orders...');
    const { error: subErr } = await supabase
        .from('sub_orders')
        .update({ vendor_id: null })
        .not('vendor_id', 'is', null);

    if (subErr) console.error('Sub-orders update error:', subErr);
    else console.log('   Cleared vendor_id in sub_orders.');

    // 4. Delete refresh tokens for removed admin & vendor accounts (39, 42, 59, 61)
    const targetIds = [39, 42, 59, 61];
    console.log(`\n4. Deleting refresh tokens for IDs: ${targetIds.join(', ')}...`);
    const { error: tokenErr } = await supabase
        .from('refresh_tokens')
        .delete()
        .in('user_id', targetIds);

    if (tokenErr) console.error('Refresh tokens delete error:', tokenErr);
    else console.log('   Refresh tokens purged.');

    // 5. Delete removed admin & vendor accounts from customers table
    console.log(`\n5. Deleting accounts from customers table: 39, 42, 59, 61...`);
    const { data: deletedUsers, error: userErr } = await supabase
        .from('customers')
        .delete()
        .in('id', targetIds)
        .select('id, name, email, role');

    if (userErr) {
        console.error('Customer delete error:', userErr);
    } else {
        console.log('   Deleted customers:', deletedUsers);
    }

    // 6. Delete northclubparis@gmail.com from Supabase Auth (auth.users)
    console.log('\n6. Checking Supabase Auth users...');
    try {
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const northClubUser = authUsers?.users?.find(u => u.email?.toLowerCase() === 'northclubparis@gmail.com');
        if (northClubUser) {
            await supabase.auth.admin.deleteUser(northClubUser.id);
            console.log(`   Deleted Auth user: ${northClubUser.email} (${northClubUser.id})`);
        } else {
            console.log('   No matching Auth users to delete.');
        }
    } catch(authErr) {
        console.error('Auth deletion error:', authErr.message);
    }

    // 7. Verify all remaining customers and their roles
    console.log('\n7. Verifying all remaining customers...');
    const { data: remainingCustomers } = await supabase
        .from('customers')
        .select('id, name, email, role, shop_id');

    console.log('   Remaining customers count:', remainingCustomers?.length);
    remainingCustomers?.forEach(c => {
        console.log(`   [ID ${c.id}] ${c.email} | Role: ${c.role} | Shop: ${c.shop_id || 'None'}`);
    });

    const superAdmins = remainingCustomers?.filter(c => c.role === 'super_admin');
    const vendors = remainingCustomers?.filter(c => c.role === 'vendor');
    const regionalAdmins = remainingCustomers?.filter(c => c.role === 'regional_admin' || c.role === 'admin');

    console.log('\n====================================================');
    console.log(`SUPER ADMINS COUNT : ${superAdmins?.length} (Expected: 1)`);
    console.log(`VENDORS COUNT      : ${vendors?.length} (Expected: 0)`);
    console.log(`REGIONAL ADMINS    : ${regionalAdmins?.length} (Expected: 0)`);
    console.log('====================================================');
}

runCleanup().catch(console.error);
