import React, { useState } from 'react';
import { User, Mail, Phone, Calendar } from 'lucide-react';

const CustomersManager = ({ isRTL }) => {
    // Mock user data
    const [customers] = useState([
        { id: 1, name: 'John Doe', email: 'john@example.com', phone: '+974 5555 1234', joinDate: '2026-01-15', totalOrders: 5, totalSpent: 3500 },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '+974 6666 5678', joinDate: '2026-02-20', totalOrders: 2, totalSpent: 1250 },
        { id: 3, name: 'Ahmed Ali', email: 'ahmed@example.com', phone: '+974 7777 9012', joinDate: '2026-03-05', totalOrders: 1, totalSpent: 520 },
        { id: 4, name: 'Guest Customer', email: 'guest@example.com', phone: 'Not Provided', joinDate: '2026-03-10', totalOrders: 1, totalSpent: 750 }
    ]);

    const [searchTerm, setSearchTerm] = useState('');

    const filteredCustomers = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="manager-content animate-fade-in">
            <div className="manager-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>{isRTL ? 'إدارة العملاء' : 'Customers Management'}</h2>
                <div style={{ position: 'relative', width: '300px' }}>
                    <input
                        type="text"
                        placeholder={isRTL ? 'ابحث عن عميل...' : 'Search customers...'}
                        className="form-control"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingRight: isRTL ? '15px' : '40px', paddingLeft: isRTL ? '40px' : '15px' }}
                    />
                </div>
            </div>

            <div className="table-responsive">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>{isRTL ? 'العميل' : 'Customer'}</th>
                            <th>{isRTL ? 'معلومات الاتصال' : 'Contact Info'}</th>
                            <th>{isRTL ? 'تاريخ الانضمام' : 'Join Date'}</th>
                            <th>{isRTL ? 'الطلبات' : 'Orders'}</th>
                            <th>{isRTL ? 'إجمالي الإنفاق' : 'Total Spent'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.map(customer => (
                            <tr key={customer.id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '40px', height: '40px', backgroundColor: '#f0f0f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                                            <User size={20} />
                                        </div>
                                        <strong>{customer.name}</strong>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ fontSize: '0.9em', color: '#555', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Mail size={14} /> {customer.email}</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Phone size={14} /> {customer.phone}</span>
                                    </div>
                                </td>
                                <td>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#555', fontSize: '0.9em' }}>
                                        <Calendar size={14} /> {customer.joinDate}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <span style={{ padding: '2px 8px', backgroundColor: '#f0f0f0', borderRadius: '12px', fontWeight: 'bold' }}>
                                        {customer.totalOrders}
                                    </span>
                                </td>
                                <td>
                                    <strong>{customer.totalSpent} {isRTL ? 'ر.ق' : 'QAR'}</strong>
                                </td>
                            </tr>
                        ))}
                        {filteredCustomers.length === 0 && (
                            <tr>
                                <td colSpan="5" className="text-center">{isRTL ? 'لا يوجد عملاء مطابقين للبحث' : 'No customers match your search'}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CustomersManager;
