import SidebarComponent from '../Home/SidebarComponent.jsx';
import { Box, Typography, Divider } from '@mui/material';
import InfoModal from '../InfoModal.jsx';
import GenericBackButton from '../GenericBackButton.js';
import { LayoutPage_theme } from './LayoutPage.theme.js';
import { useLocation } from 'react-router-dom';

const SIDEBAR_DIRECT_ROUTES = new Set([
    '/admin',
    '/admin/booking-management',
    '/admin/booking-settings',
    '/admin/room-management',
    '/admin/user-management',
    '/colleagues',
    '/createseries',
    '/defects',
    '/favourites',
    '/freedesks',
    '/freeDesks',
    '/home',
    '/manageseries',
    '/mybookings',
    '/roomSearch',
]);
/**
 * Simple template for pages.
 * 
 * @param title The title of the page. 
 * @param helpText The text that is displayed when the user clicks on the help button. If helpText === '' is true then the button is not displayed.
 * @param useGenericBackButton If true an button is displayed with that the user can navigate back.
 * @param withSidebar If true the sidebar is displayed.
 * @param withPaddingX If true around the content is an padding in x direction. 
 * @param actionElement Optional element (icon/button) displayed next to the title (right aligned).
 * @param onGenericBack Optional callback invoked when generic back button is clicked.
 * @param children The content of the page.
 */
const ROUTES_REQUIRING_BUTTON_NAVIGATION = new Set([
    '/desks',
    '/floor',
]);

const LayoutPage = ({
    title,
    helpText,
    useGenericBackButton = false,
    withSidebar = true,
    withPaddingX = false,
    actionElement = null,
    onGenericBack = null,
    children
}) => {
    const location = useLocation();
    const { pathname, state } = location;
    const normalizedPathname = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    const requiresButtonNavigation = ROUTES_REQUIRING_BUTTON_NAVIGATION.has(normalizedPathname);
    const arrivedFromPageButton = Boolean(state && typeof state === 'object' && Object.keys(state).length > 0);
    const shouldShowBackButton =
        useGenericBackButton &&
        !SIDEBAR_DIRECT_ROUTES.has(normalizedPathname) &&
        (!requiresButtonNavigation || arrivedFromPageButton);

    return (
        <Box
            sx={LayoutPage_theme.pageWrapper}
        >
            {withSidebar && <SidebarComponent />}
            <Box sx={LayoutPage_theme.content}>
                <Box sx={LayoutPage_theme.headerRow}>
                    <Typography variant='h4' component='h1' sx={LayoutPage_theme.h1}>
                        {title}
                    </Typography>
                    {actionElement}
                </Box>
                <Divider sx={LayoutPage_theme.divider} />
                <br/>
                {helpText !== '' && <InfoModal text={helpText}/>}
                {shouldShowBackButton && <GenericBackButton onBack={onGenericBack} />}
                <Box sx={withPaddingX ? LayoutPage_theme.innerContent_padding : LayoutPage_theme.innerContent}>
                    {children}
                </Box>
            </Box>
        </Box>
    );  
};

export default LayoutPage;
