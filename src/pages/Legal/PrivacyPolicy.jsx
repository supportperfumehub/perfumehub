import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';
import LegalTemplate from '../../components/LegalTemplate/LegalTemplate';

const PrivacyPolicy = () => {
    const { t } = useTranslation();
    const title = t('privacy_policy.title');
    const lastUpdated = 'October 10, 2023';

    const sections = [
        {
            heading: t('privacy_policy.h1'),
            content: [
                t('privacy_policy.p1_1'),
                t('privacy_policy.p1_2')
            ]
        },
        {
            heading: t('privacy_policy.h2'),
            content: [
                t('privacy_policy.p2_1'),
            ],
            list: [
                t('privacy_policy.l2_1'),
                t('privacy_policy.l2_2'),
                t('privacy_policy.l2_3'),
                t('privacy_policy.l2_4')
            ]
        },
        {
            heading: t('privacy_policy.h3'),
            content: [
                t('privacy_policy.p3_1')
            ]
        }
    ];

    return <LegalTemplate title={title} lastUpdated={lastUpdated} sections={sections} />;
};

export default PrivacyPolicy;
