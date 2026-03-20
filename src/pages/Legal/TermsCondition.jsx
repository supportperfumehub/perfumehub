import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';
import LegalTemplate from '../../components/LegalTemplate/LegalTemplate';

const TermsCondition = () => {
    const { t } = useTranslation();
    const title = t('terms_condition.title');
    const lastUpdated = 'October 15, 2023';

    const sections = [
        {
            heading: t('terms_condition.h1'),
            content: [
                t('terms_condition.p1_1')
            ]
        },
        {
            heading: t('terms_condition.h2'),
            content: [
                t('terms_condition.p2_1')
            ]
        },
        {
            heading: t('terms_condition.h3'),
            content: [
                t('terms_condition.p3_1')
            ],
            list: [
                t('terms_condition.l3_1'),
                t('terms_condition.l3_2'),
                t('terms_condition.l3_3')
            ]
        }
    ];

    return <LegalTemplate title={title} lastUpdated={lastUpdated} sections={sections} />;
};

export default TermsCondition;
