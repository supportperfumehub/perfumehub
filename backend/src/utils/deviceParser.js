/**
 * Utility to parse User Agent and extract device name, browser, OS, and type
 */
export const parseUserAgent = (uaString = '') => {
    if (!uaString) {
        return {
            deviceName: 'Unknown Device',
            browser: 'Unknown Browser',
            os: 'Unknown OS',
            deviceType: 'desktop'
        };
    }

    const ua = uaString.toLowerCase();
    
    // Determine OS
    let os = 'Unknown OS';
    if (ua.includes('windows nt 10.0')) os = 'Windows 10/11';
    else if (ua.includes('windows nt 6.3')) os = 'Windows 8.1';
    else if (ua.includes('windows nt 6.2')) os = 'Windows 8';
    else if (ua.includes('windows nt 6.1')) os = 'Windows 7';
    else if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('android')) {
        const match = uaString.match(/Android\s([0-9.]+)/i);
        os = match ? `Android ${match[1]}` : 'Android';
    }
    else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
        const match = uaString.match(/OS\s([0-9_]+)/i);
        os = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
    }
    else if (ua.includes('macintosh') || ua.includes('mac os x')) {
        os = 'macOS';
    }
    else if (ua.includes('linux')) {
        os = 'Linux';
    }

    // Determine Browser
    let browser = 'Web Browser';
    if (ua.includes('edg/')) {
        const match = uaString.match(/Edg\/([0-9.]+)/i);
        browser = match ? `Microsoft Edge ${match[1].split('.')[0]}` : 'Edge';
    } else if (ua.includes('chrome/') && !ua.includes('edg/')) {
        const match = uaString.match(/Chrome\/([0-9.]+)/i);
        browser = match ? `Chrome ${match[1].split('.')[0]}` : 'Chrome';
    } else if (ua.includes('safari/') && !ua.includes('chrome/')) {
        const match = uaString.match(/Version\/([0-9.]+)/i);
        browser = match ? `Safari ${match[1].split('.')[0]}` : 'Safari';
    } else if (ua.includes('firefox/')) {
        const match = uaString.match(/Firefox\/([0-9.]+)/i);
        browser = match ? `Firefox ${match[1].split('.')[0]}` : 'Firefox';
    } else if (ua.includes('opera/') || ua.includes('opr/')) {
        browser = 'Opera';
    }

    // Determine Device Type and Human-friendly Name
    let deviceType = 'desktop';
    let deviceName = `${browser} on ${os}`;

    if (ua.includes('ipad') || (ua.includes('tablet') && !ua.includes('mobile'))) {
        deviceType = 'tablet';
        deviceName = `iPad (${browser})`;
    } else if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) {
        deviceType = 'mobile';
        if (ua.includes('iphone')) {
            deviceName = `iPhone (${browser})`;
        } else if (ua.includes('samsung')) {
            deviceName = `Samsung Mobile (${browser})`;
        } else if (ua.includes('android')) {
            deviceName = `Android Device (${browser})`;
        } else {
            deviceName = `Mobile Device (${browser})`;
        }
    } else {
        deviceType = 'desktop';
        deviceName = `${browser} on ${os}`;
    }

    return {
        deviceName,
        browser,
        os,
        deviceType
    };
};
