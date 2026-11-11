import PTypography from "../PTypography/PTypography";
import { Labels } from "../../utils/constants/labels";
import { FontWeight } from "../../utils/constants/fonts";

/** The colours of the PMG logo (utils/assets/images/pmglogo.svg). Each page / menu heading uses one. */
export const PmgColors = {
    gold: "#FAB01B",
    orange: "#CF7729",
    red: "#ED3B25",
    green: "#00916B",
    berry: "#991D52",
    purple: "#512668",
    indigo: "#2D2F75",
    navy: "#16133F",
};

/** Short coloured bar shown above a heading, over its first few letters. */
export default function PHeadingAccent({ color = PmgColors.red }) {
    return <div aria-hidden="true" style={{ background: color, width: 36, height: 11 }} />;
}

/** Header-size heading with a logo-colour bar above it. */
export function PSectionHeading({ label, color, accent }) {
    return (
        <div>
            <PHeadingAccent color={accent} />
            <PTypography
                labelText={label}
                flag={Labels.fontFlags.header}
                color={color}
                weight={FontWeight.regular}
            />
        </div>
    );
}
