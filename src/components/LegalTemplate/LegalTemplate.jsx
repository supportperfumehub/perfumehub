import React, { useEffect } from 'react';
import { useLocation, useOutletContext } from 'react-router-dom';
import './LegalTemplate.css';

const LegalTemplate = ({ title, lastUpdated, sections }) => {
    const { pathname } = useLocation();
    const { isRTL } = useOutletContext();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return (
        <div className="legal-page container section" style={{ paddingTop: '150px', minHeight: '60vh' }}>
            <div className="legal-header text-center">
                <h1 className="legal-title">{title}</h1>
                {lastUpdated && <p className="legal-updated">{isRTL ? 'آخر تحديث: ' : 'Last Updated: '}{lastUpdated}</p>}
            </div>
            <div className="legal-content">
                {sections.map((section, index) => (
                    <div key={index} className="legal-section">
                        {section.heading && <h2>{section.heading}</h2>}
                        {section.content.map((paragraph, pIndex) => (
                            <p key={pIndex}>{paragraph}</p>
                        ))}
                        {section.list && (
                            <ul>
                                {section.list.map((item, lIndex) => (
                                    <li key={lIndex}>{item}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LegalTemplate;
