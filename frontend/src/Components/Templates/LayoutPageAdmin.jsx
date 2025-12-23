import { useTranslation } from 'react-i18next';
import {Typography} from '@mui/material';
import LayoutPage from './LayoutPage.jsx';
/** 
 * Simple template for pages.
 * If the user is no admin an error page is displayed.
 * 
 * @param title The title of the page. 
 * @param helpText The text that is displayed when the user clicks on the help button. If helpText === '' is true then the button is not displayed.
 * @param useGenericBackButton If true an button is displayed with that the user can navigate back.
 * @param withSidebar If true the sidebar is displayed.
 * @param withPaddingX If true around the content is an padding in x direction. 
 * @param children The content of the page.
 */
const LayoutPageAdmin = ({title, helpText, useGenericBackButton=false, withSidebar=true, withPaddingX=false, children}) => {
    const { i18n } = useTranslation();
    return JSON.parse(localStorage.getItem('admin')) 
        ? 
            <LayoutPage title={title} helpText={helpText} useGenericBackButton={useGenericBackButton} withSidebar={withSidebar} withPaddingX={withPaddingX}>
                {children}
            </LayoutPage> 
        :
            <LayoutPage
            title={i18n.language === 'de' ? 'Fehler' : 'Error'}
            helpText={''}
            withSidebar={false}
            withPaddingX={true}
            useGenericBackButton={true}
        >
            <Typography>{i18n.language === 'de' ? 'Sie besitzen nicht die nötigen Rechte diese Seite zu sehen!' : 'You have no sufficient rights to see this page!'}</Typography>
        </LayoutPage>
    
};

export default LayoutPageAdmin;