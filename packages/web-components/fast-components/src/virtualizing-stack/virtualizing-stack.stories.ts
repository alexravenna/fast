import { html } from "@microsoft/fast-element";
import addons from "@storybook/addons";
import { STORY_RENDERED } from "@storybook/core-events";
import { Orientation } from "@microsoft/fast-web-utilities";
import { VirtualizingStack as FoundationVirtualingStack } from "@microsoft/fast-foundation";
import VirtualizingStackTemplate from "./fixtures/base.html";
import "./index";

const imageItemTemplate = html`
    <fast-card
        style="
            background: olive;
            height:100%;
            width:100%;
            grid-row: ${(x, c) =>
            c.parent.orientation === Orientation.vertical
                ? c.index + c.parent.virtualizedIndexOffset
                : 1};
            grid-column: ${(x, c) =>
            c.parent.orientation === Orientation.horizontal
                ? c.index + c.parent.virtualizedIndexOffset
                : 1};
        "
    >
        <image
            style="
                height:100%;
                width:100%;
            "
            src="${x => x.url}"
        ></image>
    </fast-card>
`;

addons.getChannel().addListener(STORY_RENDERED, (name: string) => {
    if (name.toLowerCase().startsWith("virtualizing-stack")) {
        const data = newDataSet(100000);

        const stackh1 = document.getElementById("stackh1") as FoundationVirtualingStack;
        stackh1.itemTemplate = imageItemTemplate;
        stackh1.viewportElement = document.documentElement;
        stackh1.items = data;

        const stackh2 = document.getElementById("stackh2") as FoundationVirtualingStack;
        stackh2.itemTemplate = imageItemTemplate;
        stackh2.items = data;

        const stackh3 = document.getElementById("stackh3") as FoundationVirtualingStack;
        stackh3.itemTemplate = imageItemTemplate;
        stackh3.items = data;

        const stackh4 = document.getElementById("stackh4") as FoundationVirtualingStack;
        stackh4.itemTemplate = imageItemTemplate;
        stackh4.items = data;

        const stackv1 = document.getElementById("stackv1") as FoundationVirtualingStack;
        stackv1.itemTemplate = imageItemTemplate;
        stackv1.items = data;

        const stackv2 = document.getElementById("stackv2") as FoundationVirtualingStack;
        stackv2.itemTemplate = imageItemTemplate;
        stackv2.items = data;

        const stackv3 = document.getElementById("stackv3") as FoundationVirtualingStack;
        stackv3.itemTemplate = imageItemTemplate;
        stackv3.items = data;
        stackv3.startRegionSpan = 100;
        stackv3.endRegionSpan = 100;
    }
});

function newDataSet(rowCount: number): object[] {
    const newData: object[] = [];
    for (let i = 0; i <= rowCount; i++) {
        newData.push({
            url: `https://via.placeholder.com/100x100/414141/?text=${i + 1}`,
        });
    }
    return newData;
}

export default {
    title: "Virtualizing Stack",
};

export const VirtualizingStack = () => VirtualizingStackTemplate;
