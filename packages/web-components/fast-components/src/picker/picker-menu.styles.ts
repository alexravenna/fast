import { css, ElementStyles } from "@microsoft/fast-element";
import {
    ElementDefinitionContext,
    focusVisible,
    forcedColorsStylesheetBehavior,
    FoundationElementDefinition,
} from "@microsoft/fast-foundation";
import { SystemColors } from "@microsoft/fast-web-utilities";
import {
    accentFillActive,
    bodyFont,
    controlCornerRadius,
    designUnit,
    focusStrokeOuter,
    focusStrokeWidth,
    foregroundOnAccentActive,
    neutralForegroundRest,
    neutralLayer3,
    neutralLayerFloating,
    strokeWidth,
    typeRampBaseFontSize,
    typeRampBaseLineHeight,
} from "../design-tokens";
import { elevation, heightNumber } from "../styles/index";

export const pickerMenuStyles: (
    context: ElementDefinitionContext,
    definition: FoundationElementDefinition
) => ElementStyles = (
    context: ElementDefinitionContext,
    definition: FoundationElementDefinition
) =>
    css`
        :host {
            background: ${neutralLayerFloating};
            --elevation: 11;
            z-index: 1000;
            display: flex;
            width: 100%;
            max-height: 100%;
            min-height: 58px;
            flex-direction: column;
            overflow-y: auto;
            overflow-x: hidden;
            pointer-events: auto;
            border-radius: calc(${controlCornerRadius} * 1px);
            padding: calc(${designUnit} * 1px) 0;
            border: calc(${strokeWidth} * 1px) solid transparent;
            ${elevation}
        }

        .suggestions-available-alert {
            height: 0;
            opacity: 0;
            overflow: hidden;
        }

        ::slotted([role="listitem"]) {
            display: flex;
            align-items: center;
            justify-items: center;
            font-family: ${bodyFont};
            border-radius: calc(${controlCornerRadius} * 1px);
            border: calc(${focusStrokeWidth} * 1px) solid transparent;
            box-sizing: border-box;
            color: ${neutralForegroundRest};
            cursor: pointer;
            fill: currentcolor;
            font-size: ${typeRampBaseFontSize};
            height: calc(${heightNumber} * 1px);
            line-height: ${typeRampBaseLineHeight};
            margin: 0 calc(${designUnit} * 1px);
            outline: none;
            overflow: hidden;
            padding: 0 calc(${designUnit} * 2.25px);
            user-select: none;
            white-space: nowrap;
        }

        ::slotted(:${focusVisible}[role="listitem"]) {
            border-color: ${focusStrokeOuter};
            background: ${neutralLayer3};
            color: ${neutralForegroundRest};
        }
    
        ::slotted(:hover[role="listitem"]) {
            background: ${neutralLayer3};
            color: ${neutralForegroundRest};
        }

        ::slotted([role="listitem"][aria-selected="true"]) {
            background: ${accentFillActive};
            color: ${foregroundOnAccentActive};
        }
    `.withBehaviors(
        forcedColorsStylesheetBehavior(
            css`
                :host {
                    background: ${SystemColors.Canvas};
                    border-color: ${SystemColors.CanvasText};
                }
            `
        )
    );