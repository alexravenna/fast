import {
    attr,
    DOM,
    enableArrayObservation,
    html,
    Notifier,
    nullableNumberConverter,
    Observable,
    observable,
    RepeatBehavior,
    RepeatDirective,
    Splice,
    ViewTemplate,
} from "@microsoft/fast-element";
import { eventResize, eventScroll, Orientation } from "@microsoft/fast-web-utilities";
import { FoundationElement } from "../foundation-element";
import { IntersectionService } from "../utilities/intersection-service";
import type { ResizeObserverClassDefinition } from "../utilities/resize-observer";

/**
 * Defines when the component updates its position automatically.
 *
 * @beta
 */
export type VirtualizingStackAutoUpdateMode = "manual" | "viewport-resize" | "auto";

/**
 * The default item template
 * Authors will typically want to provide a template specific to their needs
 * as the default one
 *
 */
const defaultItemTemplate: ViewTemplate<any> = html`
    <div
        style="
            overflow-wrap: anywhere;
            overflow: hidden;
            height: 100%;
            width: 100%;
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
        ${x => JSON.stringify(x)}
    </div>
`;

/**
 *  The VirtualizingStack class
 *
 * @public
 */
export class VirtualizingStack extends FoundationElement {
    /**
     *  The array of items to be displayed
     *
     * @public
     */
    @observable
    public items: object[] = [];
    private itemsChanged(): void {
        if (this.$fastController.isConnected) {
            this.reset();
        }
    }

    /**
     *  Whether or not the display should virtualize
     *
     * @beta
     */
    @attr({ attribute: "virtualize", mode: "boolean" })
    public virtualize: boolean = true;
    private virtualizeChanged(): void {
        if (this.$fastController.isConnected) {
            this.reset();
        }
    }

    /**
     * The HTML ID of the viewport element
     *
     * @beta
     * @remarks
     * HTML Attribute: anchor
     */
    @attr({ attribute: "viewport" })
    public viewport: string = "";
    private viewportChanged(): void {
        if (this.$fastController.isConnected) {
            this.viewportElement = this.getViewport();
            this.updateDimensions();
        }
    }

    /**
     * The span in pixels of each item along the virtualization axis
     * Note used when a spanMap is provided
     *
     * @beta
     * @remarks
     * HTML Attribute: item-span
     */
    @attr({ attribute: "item-span", converter: nullableNumberConverter })
    public itemSpan: number = 50;
    private itemSpanChanged(): void {
        if (this.$fastController.isConnected) {
            this.updateDimensions();
        }
    }

    /**
     * Defines an area in pixels on either end of the viewport where items outside the viewport
     * will still be rendered.
     *
     * @beta
     * @remarks
     * HTML Attribute: viewport-buffer
     */
    @attr({ attribute: "viewport-buffer", converter: nullableNumberConverter })
    public viewportBuffer: number = 100;

    /**
     * Defines an interval in ms where layout updates are delayed if another position update is
     * triggered before the interval passes. May be useful for preventing transient elements from
     * rendering during long scroll operations.
     *
     * @beta
     * @remarks
     * HTML Attribute: layout-update-delay
     */
    @attr({ attribute: "layout-update-delay", converter: nullableNumberConverter })
    public layoutUpdateDelay: number = 0;

    /**
     * Whether the stack is oriented vertically or horizontally.
     * Default is vertical
     *
     * @beta
     * @remarks
     * HTML Attribute: orientation
     */
    @attr
    public orientation: Orientation = Orientation.vertical;
    private orientationChanged(): void {
        if (this.$fastController.isConnected) {
            this.updateDimensions();
        }
    }

    /**
     * Auto update mode defines what prompts the component to check the dimensions of elements
     * in the DOM and reset the visible items accordingly.  Calling update() always provokes an update.
     *
     * @beta
     * @remarks
     * HTML Attribute: auto-update-mode
     */
    @attr({ attribute: "auto-update-mode" })
    public autoUpdateMode: VirtualizingStackAutoUpdateMode = "manual";
    private autoUpdateModeChanged(
        prevMode: VirtualizingStackAutoUpdateMode,
        newMode: VirtualizingStackAutoUpdateMode
    ): void {
        if (this.$fastController.isConnected) {
            this.resetAutoUpdateMode(prevMode, newMode);
        }
    }

    /**
     * The span in pixels of the start region.
     *
     * @beta
     * @remarks
     * HTML Attribute: start-region-span
     */
    @attr({ attribute: "start-region-span", converter: nullableNumberConverter })
    public startRegionSpan: number = 0;
    private startRegionSpanChanged(): void {
        if (this.$fastController.isConnected) {
            this.updateDimensions();
        }
    }

    /**
     * The span in pixels of the end region.
     *
     * @beta
     * @remarks
     * HTML Attribute: end-region-span
     */
    @attr({ attribute: "end-region-span", converter: nullableNumberConverter })
    public endRegionSpan: number = 0;
    private endRegionSpanChanged(): void {
        if (this.$fastController.isConnected) {
            this.updateDimensions();
        }
    }

    /**
     * The HTML element being used as the viewport
     *
     * @beta
     */
    @observable
    public viewportElement: HTMLElement;
    private viewportElementChanged(): void {
        if ((this as FoundationElement).$fastController.isConnected) {
            this.resetAutoUpdateMode(this.autoUpdateMode, this.autoUpdateMode);
        }
    }

    /**
     * tbd
     *
     * @public
     */
    @observable
    public spanMap: number[];
    private spanChanged(): void {
        if (this.$fastController.isConnected) {
            this.updateDimensions();
        }
    }

    /**
     * The ViewTemplate used to render items.
     *
     * @public
     */
    @observable
    public itemTemplate: ViewTemplate = defaultItemTemplate;

    /**
     * Accounts for css grids not being zero based, the spacer span, and the start region
     *
     * @internal
     */
    @observable
    public virtualizedIndexOffset: number = 3;

    /**
     * The items that are currently visible (includes buffer regions)
     *
     * @internal
     */
    @observable
    public visibleItems: any[] = [];

    /**
     * The calculated span of the total stack.
     * (ie. all items + start/end regions)
     *
     * @internal
     */
    @observable
    public totalStackSpan: number = 0;

    /**
     * The size in pixels of the start "spacer"
     * (ie. the grid region that holds space for non-rendered elements at the start of the stack)
     *
     * @internal
     */
    @observable
    public startSpacerSpan: number = 0;

    /**
     * The size in pixels of the end "spacer"
     * (ie. the grid region that holds space for non-rendered elements at the end of the stack)
     *
     * @internal
     */
    @observable
    public endSpacerSpan: number = 0;

    /**
     * Depending on orientation, the "grid-template-columns" or "grid-template-rows" value
     * applied to the stack
     *
     * @internal
     */
    @observable
    public gridTemplateSpans: string;

    /**
     * The index of the first item in the array to be rendered
     *
     * @internal
     */
    @observable
    public firstRenderedIndex: number = -1;

    /**
     * The index of the last item in the array to be rendered
     *
     * @internal
     */
    @observable
    public lastRenderedIndex: number = -1;

    /**
     * reference to the container element
     *
     * @internal
     */
    public containerElement: HTMLDivElement;

    protected allowLayoutUpdateDelay: boolean = true;

    private static intersectionService: IntersectionService = new IntersectionService();
    private resizeDetector: ResizeObserverClassDefinition | null = null;

    private pendingPositioningUpdate: boolean = false;
    private pendingReset: boolean = false;

    private visibleRangeStart: number = 0;
    private visibleRangeEnd: number = 0;

    private viewportRect: ClientRect | DOMRect | undefined;
    private containerRect: ClientRect | DOMRect | undefined;

    private itemsRepeatBehavior: RepeatBehavior | null = null;
    private itemsPlaceholder: Node;

    private itemsObserver: Notifier | null = null;
    private itemCount: number = 0;

    private finalUpdate: boolean = false;

    /**
     * Delays updating ui during scrolling
     * (to avoid rendering of items that just scroll by)
     */
    private scrollLayoutUpdateTimer: number | null = null;

    /**
     * @internal
     */
    connectedCallback() {
        super.connectedCallback();
        if (this.viewportElement === undefined) {
            this.viewportElement = this.getViewport();
        }
        this.resetAutoUpdateMode("manual", this.autoUpdateMode);

        if (this.itemsPlaceholder === undefined) {
            this.itemsPlaceholder = document.createComment("");
            this.appendChild(this.itemsPlaceholder);
        }

        enableArrayObservation();
        this.initializeRepeatBehavior();
        this.doReset();
    }

    /**
     * @internal
     */
    public disconnectedCallback(): void {
        super.disconnectedCallback();
        if (this.autoUpdateMode === "auto") {
            this.stopViewportResizeDetector();
        }
        this.cancelPendingPositionUpdates();
        this.unobserveItems();
        this.clearRepeatBehavior();
        this.disconnectResizeDetector();
        this.clearLayoutUpdateTimer();
    }

    /**
     * starts observing the items array
     */
    private observeItems(): void {
        if (!this.items) {
            return;
        }

        if (this.itemsObserver !== null) {
            this.unobserveItems();
        }

        // TODO:  we don't use splices calculated by array change events
        // look for cheaper observer implementation later

        const newObserver = (this.itemsObserver = Observable.getNotifier(this.items));
        newObserver.subscribe(this);
    }

    /**
     * stops observing the items array
     */
    private unobserveItems(): void {
        if (this.itemsObserver !== null) {
            this.itemsObserver.unsubscribe(this);
            this.itemsObserver = null;
        }
    }

    /**
     * The items list has mutated
     *
     * @internal
     */
    public handleChange(source: any, splices: Splice[]): void {
        const firstRenderedIndex =
            this.firstRenderedIndex >= this.items.length
                ? this.items.length - 1
                : this.firstRenderedIndex;
        const lastRenderedIndex =
            this.lastRenderedIndex >= this.items.length
                ? this.items.length - 1
                : this.lastRenderedIndex;

        const newVisibleItems: object[] = this.items.slice(
            firstRenderedIndex,
            lastRenderedIndex + 1
        );

        this.visibleItems.splice(0, this.visibleItems.length, ...newVisibleItems);

        if (this.itemCount !== this.items.length) {
            this.itemCount = this.items.length;
            this.updateDimensions();
        }
        this.requestPositionUpdates();
    }

    /**
     * Request a layout update
     *
     * @public
     */
    public update(): void {
        this.requestPositionUpdates();
    }

    /**
     * the position in the stack (in pixels) of the a particular item index in the
     * base source data
     *
     * @public
     */
    public getGeneratedItemPosition = (itemIndex: number): number => {
        if (itemIndex < 0 || itemIndex >= this.items.length) {
            // out of range
            return 0;
        }

        let returnVal = 0;

        if (this.spanMap !== undefined) {
            // todo
            returnVal = 0;
        } else {
            returnVal = this.startRegionSpan + itemIndex * this.itemSpan;
        }

        return returnVal;
    };

    /**
     * get position updates
     */
    public requestPositionUpdates = (): void => {
        if (!this.virtualize || this.pendingPositioningUpdate) {
            this.finalUpdate = true;
            return;
        }
        this.finalUpdate = false;
        this.pendingPositioningUpdate = true;
        this.clearLayoutUpdateTimer();

        DOM.queueUpdate(() => {
            VirtualizingStack.intersectionService.requestPosition(
                this.containerElement,
                this.handleIntersection
            );
            VirtualizingStack.intersectionService.requestPosition(
                this.viewportElement,
                this.handleIntersection
            );
        });
    };

    /**
     * request reset
     */
    protected reset(): void {
        if (this.pendingReset) {
            return;
        }

        this.pendingReset = true;

        DOM.queueUpdate(() => {
            this.doReset();
        });
    }

    /**
     * execute reset
     */
    private doReset(): void {
        this.pendingReset = false;
        this.cancelPendingPositionUpdates();

        if (this.virtualize) {
            this.initializeResizeDetector();
            this.observeItems();
            this.updateDimensions();
        } else {
            this.disconnectResizeDetector();
            this.unobserveItems();
            this.visibleItems.splice(0, this.visibleItems.length, ...this.items);
            this.updateDimensions();
            this.updateRenderedRange(0, this.visibleItems.length - 1);
        }
    }

    private initializeRepeatBehavior(): void {
        if (this.itemsRepeatBehavior !== null) {
            return;
        }
        this.itemsRepeatBehavior = new RepeatDirective(
            x => x.visibleItems,
            x => x.itemTemplate,
            { positioning: true }
        ).createBehavior(this.itemsPlaceholder);
        this.$fastController.addBehaviors([this.itemsRepeatBehavior!]);
    }

    private clearRepeatBehavior(): void {
        this.visibleItems = [];

        // TODO: What is right way to handle this?
        //       removing the behavior leaves the nodes in the dom
        // if (this.itemsRepeatBehavior !== null) {
        //     this.$fastController.removeBehaviors([this.itemsRepeatBehavior]);
        //     this.itemsRepeatBehavior = null;
        // }
    }

    private cancelPendingPositionUpdates(): void {
        if (this.pendingPositioningUpdate) {
            this.pendingPositioningUpdate = false;
            VirtualizingStack.intersectionService.cancelRequestPosition(
                this.containerElement,
                this.handleIntersection
            );
            if (this.viewportElement !== null) {
                VirtualizingStack.intersectionService.cancelRequestPosition(
                    this.viewportElement,
                    this.handleIntersection
                );
            }
        }
    }

    private resetAutoUpdateMode(
        prevMode: VirtualizingStackAutoUpdateMode,
        newMode: VirtualizingStackAutoUpdateMode
    ): void {
        switch (prevMode) {
            case "auto":
                this.stopViewportResizeDetector();
                this.stopWindowEventListeners();
                break;

            case "viewport-resize":
                this.stopViewportResizeDetector();
                break;
        }

        switch (newMode) {
            case "auto":
                this.startViewportResizeDetector();
                this.startWindowUpdateEventListeners();
                break;

            case "viewport-resize":
                this.startViewportResizeDetector();
                break;
        }
    }

    /**
     * initializes the instance's resize observer
     */
    private initializeResizeDetector(): void {
        if (this.resizeDetector !== null) {
            return;
        }
        this.resizeDetector = new ((window as unknown) as WindowWithResizeObserver).ResizeObserver(
            this.requestPositionUpdates
        );
        this.resizeDetector.observe(this);
    }

    /**
     * destroys the instance's resize observer
     */
    private disconnectResizeDetector(): void {
        if (this.resizeDetector !== null) {
            this.resizeDetector.unobserve(this);
            this.resizeDetector.disconnect();
            this.resizeDetector = null;
        }
    }

    /**
     * starts the layout update timer
     * clears existing timer beforehand
     */
    private startLayoutUpdateTimer(): void {
        this.clearLayoutUpdateTimer();
        this.scrollLayoutUpdateTimer = window.setTimeout((): void => {
            this.clearLayoutUpdateTimer();
            this.updateVisibleItems();
        }, this.layoutUpdateDelay);
    }

    /**
     * clears the layout update timer
     */
    private clearLayoutUpdateTimer(): void {
        if (this.scrollLayoutUpdateTimer !== null) {
            window.clearTimeout(this.scrollLayoutUpdateTimer);
            this.scrollLayoutUpdateTimer = null;
        }
    }

    /**
     * starts the viewport resize detector
     */
    private startViewportResizeDetector = (): void => {
        if (this.resizeDetector !== null && this.viewportElement !== null) {
            this.resizeDetector.observe(this.viewportElement);
        }
    };

    /**
     * stops the viewport resize detector
     */
    private stopViewportResizeDetector = (): void => {
        if (this.resizeDetector !== null && this.viewportElement !== null) {
            this.resizeDetector.unobserve(this.viewportElement);
        }
    };

    /**
     * starts window level event listeners that can trigger auto updating
     * (scroll and resize)
     */
    private startWindowUpdateEventListeners = (): void => {
        window.addEventListener(eventResize, this.handleResizeEvent, {
            passive: true,
        });
        window.addEventListener(eventScroll, this.handleScrollEvent, {
            passive: true,
            capture: true,
        });
    };

    /**
     * handle scroll events
     */
    private handleScrollEvent = (e: Event): void => {
        this.requestPositionUpdates();
    };

    /**
     * handle resize events
     */
    private handleResizeEvent = (e: Event): void => {
        this.requestPositionUpdates();
    };

    /**
     * stops event listeners that can trigger auto updating
     */
    private stopWindowEventListeners = (): void => {
        window.removeEventListener(eventResize, this.requestPositionUpdates);
        window.removeEventListener(eventScroll, this.requestPositionUpdates);
    };

    /**
     * Gets the viewport element by id, or defaults to element
     */
    private getViewport = (): HTMLElement => {
        let viewportElement: HTMLElement | null = null;
        if (typeof this.viewport === "string") {
            viewportElement = document.getElementById(this.viewport);
        }

        if (viewportElement !== null) {
            return viewportElement;
        }

        return this;
    };

    /**
     * updates the dimensions of the stack
     */
    private updateDimensions = (): void => {
        if (this.items === undefined) {
            this.totalStackSpan = 0;
        } else {
            if (this.spanMap !== undefined) {
                if (this.spanMap.length === 0) {
                    //TODO: wire this up
                    this.totalStackSpan = 0;
                }
            } else {
                this.totalStackSpan = this.itemSpan * this.items.length;
            }
        }

        this.totalStackSpan =
            this.totalStackSpan + this.startRegionSpan + this.endRegionSpan;

        this.requestPositionUpdates();
    };

    /**
     *  Updates the visible items
     */
    private updateVisibleItems = (): void => {
        if (this.pendingPositioningUpdate) {
            return;
        }

        if (
            this.items === undefined ||
            this.items.length === 0 ||
            this.containerRect === undefined ||
            this.viewportRect === undefined
        ) {
            this.visibleItems = [];
            this.startSpacerSpan = 0;
            this.endSpacerSpan = 0;
            this.visibleRangeStart = -1;
            this.visibleRangeEnd = -1;
            return;
        }

        let viewportStart: number = this.viewportRect.top;
        let viewportEnd: number = this.viewportRect.bottom;
        let containerStart: number = this.containerRect.top + this.startRegionSpan;
        let containerEnd: number = this.containerRect.bottom - this.endRegionSpan;
        let containerSpan: number = this.containerRect.height;

        if (this.orientation === Orientation.horizontal) {
            viewportStart = this.viewportRect.left;
            viewportEnd = this.viewportRect.right;
            containerStart = this.containerRect.left + this.startRegionSpan;
            containerEnd = this.containerRect.right - this.endRegionSpan;
            containerSpan = this.containerRect.width;
        }

        if (viewportStart >= containerEnd) {
            this.visibleRangeStart = containerSpan;
            this.visibleRangeEnd = containerSpan;
        } else if (viewportEnd <= containerStart) {
            this.visibleRangeStart = 0;
            this.visibleRangeEnd = 0;
        } else {
            this.visibleRangeStart = viewportStart - containerStart - this.viewportBuffer;
            this.visibleRangeEnd =
                containerSpan - (containerEnd - (viewportEnd + this.viewportBuffer));

            this.visibleRangeStart =
                this.visibleRangeStart < 0 ? 0 : this.visibleRangeStart;
            this.visibleRangeEnd =
                this.visibleRangeEnd > containerSpan
                    ? containerSpan
                    : this.visibleRangeEnd;
        }

        if (this.spanMap !== undefined) {
            // TODO: scomea - wire this up
            this.visibleItems = [];
            this.startSpacerSpan = 0;
            this.endSpacerSpan = 0;
        } else if (this.itemSpan !== undefined) {
            let newFirstRenderedIndex: number = Math.floor(
                this.visibleRangeStart / this.itemSpan
            );
            const visibleRangeLength = this.visibleRangeEnd - this.visibleRangeStart;
            let newLastRenderedIndex: number =
                newFirstRenderedIndex + Math.ceil(visibleRangeLength / this.itemSpan);

            if (newFirstRenderedIndex < 0) {
                newFirstRenderedIndex = 0;
            }

            if (newLastRenderedIndex >= this.items.length) {
                newLastRenderedIndex = this.items.length - 1;
            }

            this.startSpacerSpan = newFirstRenderedIndex * this.itemSpan;
            this.endSpacerSpan =
                (this.items.length - newLastRenderedIndex - 1) * this.itemSpan;

            const newVisibleItems: object[] = this.items.slice(
                newFirstRenderedIndex,
                newLastRenderedIndex + 1
            );

            this.visibleItems.splice(0, this.visibleItems.length, ...newVisibleItems);

            this.updateRenderedRange(newFirstRenderedIndex, newLastRenderedIndex);
        }
    };

    /**
     *  Updates the range of rendered items
     */
    private updateRenderedRange(
        newFirstRenderedIndex: number,
        newLastRenderedIndex: number
    ): void {
        if (
            newFirstRenderedIndex === this.firstRenderedIndex &&
            newLastRenderedIndex === this.lastRenderedIndex
        ) {
            return;
        }

        this.firstRenderedIndex = newFirstRenderedIndex;
        this.lastRenderedIndex = newLastRenderedIndex;

        this.updateGridTemplateSpans();

        this.$emit("rendered-range-change", this, { bubbles: false });
    }

    private updateGridTemplateSpans(): void {
        this.gridTemplateSpans = `[start]${this.startRegionSpan}px ${this.startSpacerSpan}px repeat(${this.visibleItems.length}, ${this.itemSpan}px) ${this.endSpacerSpan}px [end]${this.endRegionSpan}px`;
    }

    /**
     *  Handle intersections
     */
    private handleIntersection = (entries: IntersectionObserverEntry[]): void => {
        if (!this.pendingPositioningUpdate) {
            return;
        }

        this.pendingPositioningUpdate = false;

        if (this.finalUpdate) {
            this.requestPositionUpdates();
        }

        const containerEntry: IntersectionObserverEntry | undefined = entries.find(
            x => x.target === this.containerElement
        );
        const viewportEntry: IntersectionObserverEntry | undefined = entries.find(
            x => x.target === this.viewportElement
        );

        if (containerEntry === undefined || viewportEntry === undefined) {
            return;
        }

        this.containerRect = containerEntry.boundingClientRect;
        if (this.viewportElement === document.documentElement) {
            this.viewportRect = new DOMRectReadOnly(
                viewportEntry.boundingClientRect.x + document.documentElement.scrollLeft,
                viewportEntry.boundingClientRect.y + document.documentElement.scrollTop,
                viewportEntry.boundingClientRect.width,
                viewportEntry.boundingClientRect.height
            );
        } else {
            this.viewportRect = viewportEntry.boundingClientRect;
        }

        if (this.layoutUpdateDelay > 0 && this.allowLayoutUpdateDelay) {
            this.startLayoutUpdateTimer();
            return;
        }
        this.updateVisibleItems();
    };
}
