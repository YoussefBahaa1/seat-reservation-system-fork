import { styled } from '@mui/material/styles';
import {Tooltip, tooltipClasses} from '@mui/material';
import { colorVars } from '../../theme';

/**
 * Make room icons look/behave better.
 */
const HtmlTooltip = styled(({ className, ...props }) => (
    <Tooltip {...props} classes={{ popper: className }} />
    ))(({ theme }) => ({
    [`& .${tooltipClasses.tooltip}`]: {
        backgroundColor: colorVars.surface.tooltip,
        color: colorVars.text.strong,
        maxWidth: 220,
        fontSize: theme.typography.pxToRem(12),
        border: `1px solid ${colorVars.border.default}`,
    },
}));

export default HtmlTooltip;
