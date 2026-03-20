import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';
import LegalTemplate from '../../components/LegalTemplate/LegalTemplate';

const RefundPolicy = () => {
    const { t } = useTranslation();
    const title = t('refund_policy.title');
    const lastUpdated = 'November 01, 2023';

    const sections = [
        {
            heading: t('refund_policy.h1'),
            content: [
                t('refund_policy.p1_1')
            ],
            list: [
                t('refund_policy.l1_1'),
                t('refund_policy.l1_2'),
                t('refund_policy.l1_3')
            ]
        },
        {
            heading: t('refund_policy.h2'),
            content: [
                t('refund_policy.p2_1')
            ]
        },
        {
            heading: t('refund_policy.h3'),
            content: [
                t('refund_policy.p3_1')
            ]
        }
    ];

    return <LegalTemplate title={title} lastUpdated={lastUpdated} sections={sections} />;
};

export default RefundPolicy;
