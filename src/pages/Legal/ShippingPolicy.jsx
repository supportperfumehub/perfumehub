import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';
import LegalTemplate from '../../components/LegalTemplate/LegalTemplate';

const ShippingPolicy = () => {
    const { t } = useTranslation();
    const title = t('shipping_policy.title');
    const lastUpdated = 'November 05, 2023';

    const sections = [
        {
            heading: t('shipping_policy.h1'),
            content: [
                t('shipping_policy.p1_1'),
                t('shipping_policy.p1_2')
            ]
        },
        {
            heading: t('shipping_policy.h2'),
            content: [
                t('shipping_policy.p2_1'),
                t('shipping_policy.p2_2', { currency: t('common.currency') })
            ]
        },
        {
            heading: t('shipping_policy.h3'),
            content: [
                t('shipping_policy.p3_1')
            ]
        }
    ];

    return <LegalTemplate title={title} lastUpdated={lastUpdated} sections={sections} />;
};

export default ShippingPolicy;
