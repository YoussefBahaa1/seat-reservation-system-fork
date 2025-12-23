import SidebarComponent from '../Home/SidebarComponent.jsx';
import { Box, Typography, Divider} from '@mui/material';
import InfoModal from '../InfoModal.jsx';
import GenericBackButton from '../GenericBackButton.js';
import {LayoutPage_theme} from './LayoutPage.theme.js';
/** 
 * Simple template for pages.
 * 
 * @param title The title of the page. 
 * @param helpText The text that is displayed when the user clicks on the help button. If helpText === '' is true then the button is not displayed.
 * @param useGenericBackButton If true an button is displayed with that the user can navigate back.
 * @param withSidebar If true the sidebar is displayed.
 * @param withPaddingX If true around the content is an padding in x direction. 
 * @param children The content of the page.
 */
const LayoutPage = ({title, helpText, useGenericBackButton=false, withSidebar=true, withPaddingX=false, children}) => {

    return (
        <Box
            sx={LayoutPage_theme.pageWrapper}
        >
            {withSidebar && <SidebarComponent />}
            <Box sx={LayoutPage_theme.content}>
                <Typography variant='h4' component='h1' sx={LayoutPage_theme.h1}>
                    {title}
                </Typography>
                
                <Divider sx={LayoutPage_theme.divider} />
                <br/>
                {helpText !== '' && <InfoModal text={helpText}/>}
                {useGenericBackButton && <GenericBackButton/>}
                <Box sx={withPaddingX ? LayoutPage_theme.innerContent_padding : LayoutPage_theme.innerContent}>
                    {children}
                </Box>
            </Box>
        </Box>
    );  
};

export default LayoutPage;