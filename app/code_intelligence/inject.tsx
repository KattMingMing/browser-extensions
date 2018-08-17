import {
    ContextResolver,
    createHoverifier,
    DiffPart,
    DOMFunctions,
    findPositionsFromEvents,
    Hoverifier,
    HoverOverlay,
    HoverState,
    LinkComponent,
    PositionAdjuster,
} from '@sourcegraph/codeintellify'
import { propertyIsDefined } from '@sourcegraph/codeintellify/lib/helpers'
import { HoverMerged } from '@sourcegraph/codeintellify/lib/types'
import { toPrettyBlobURL } from '@sourcegraph/codeintellify/lib/url'
import * as React from 'react'
import { render } from 'react-dom'
import { Observable, of, Subject, Subscription } from 'rxjs'
import { filter, map, withLatestFrom } from 'rxjs/operators'

import { createJumpURLFetcher } from '../backend/lsp'
import { lspViaAPIXlang } from '../backend/lsp'
import { ButtonProps, CodeViewToolbar } from '../components/CodeViewToolbar'
import { eventLogger, sourcegraphUrl } from '../util/context'

/** Information for adding code intelligence to code views on arbitrary code hosts. */
export interface CodeHostInfo {
    /**
     * The name of the code host. This will be added as a className to the overlay mount.
     */
    name: string
    /**
     * The list of types of code views to try to annotate.
     */
    codeViews: CodeViewInfo[]
}

export interface FileInfo {
    /**
     * The path for the repo the file belongs to. If a `baseRepoPath` is provided, this value
     * is treated as the head repo path.
     */
    repoPath: string
    /**
     * The path for the file path for a given `codeView`. If a `baseFilePath` is provided, this value
     * is treated as the head file path.
     */
    filePath: string
    /**
     * The commit that the code view is at. If a `baseCommitID` is provided, this value is treated
     * as the head commit ID.
     */
    commitID: string
    /**
     * The revision the code view is at. If a `baseRev` is provided, this value is treated as the head rev.
     */
    rev?: string

    /**
     * The repo bath for the BASE side of a diff. This is useful for Phabricator staging areas since they are separate repos.
     */
    baseRepoPath?: string
    /**
     * The base file path.
     */
    baseFilePath?: string
    /**
     * Commit ID for the BASE side of the diff.
     */
    baseCommitID?: string
    /**
     * Revision for the BASE side of the diff.
     */
    baseRev?: string

    headHasFileContents?: boolean
    baseHasFileContents?: boolean
}

export interface CodeViewInfo {
    selector: string
    dom: DOMFunctions
    getToolbarMount?: (codeView: HTMLElement, part?: DiffPart) => HTMLElement
    resolveFileInfo(codeView: HTMLElement): Observable<FileInfo>
    adjustPosition?: PositionAdjuster
    toolbarButtonProps?: ButtonProps
}

function createCodeIntelligenceContainer(info: CodeHostInfo): { hoverifier: Hoverifier } {
    /** Emits when the go to definition button was clicked */
    const goToDefinitionClicks = new Subject<MouseEvent>()
    const nextGoToDefinitionClick = (event: MouseEvent) => goToDefinitionClicks.next(event)

    /** Emits when the close button was clicked */
    const closeButtonClicks = new Subject<MouseEvent>()
    const nextCloseButtonClick = (event: MouseEvent) => closeButtonClicks.next(event)

    /** Emits whenever the ref callback for the hover element is called */
    const hoverOverlayElements = new Subject<HTMLElement | null>()
    const nextOverlayElement = (element: HTMLElement | null) => hoverOverlayElements.next(element)

    const overlayMount = document.createElement('div')
    overlayMount.style.height = '0px'
    overlayMount.classList.add(`hover-overlay__${info.name}`)
    document.body.appendChild(overlayMount)

    const relativeElement = document.body

    const fetchJumpURL = createJumpURLFetcher(lspViaAPIXlang.fetchDefinition, toPrettyBlobURL)

    const containerComponentUpdates = new Subject<void>()

    const hoverifier = createHoverifier({
        closeButtonClicks,
        goToDefinitionClicks,
        hoverOverlayElements,
        hoverOverlayRerenders: containerComponentUpdates.pipe(
            withLatestFrom(hoverOverlayElements),
            map(([, hoverOverlayElement]) => ({ hoverOverlayElement, relativeElement })),
            filter(propertyIsDefined('hoverOverlayElement'))
        ),
        pushHistory: path => {
            location.href = path
        },
        fetchHover: ({ line, character, part, ...rest }) =>
            lspViaAPIXlang
                .fetchHover({ ...rest, position: { line, character } })
                .pipe(map(hover => (hover ? (hover as HoverMerged) : hover))),
        fetchJumpURL,
        logTelemetryEvent: () => eventLogger.logCodeIntelligenceEvent(),
    })

    const Link: LinkComponent = ({ to, children, ...rest }) => (
        <a href={new URL(to, sourcegraphUrl).href} {...rest}>
            {children}
        </a>
    )

    class HoverOverlayContainer extends React.Component<{}, HoverState> {
        constructor(props: {}) {
            super(props)
            this.state = hoverifier.hoverState
            hoverifier.hoverStateUpdates.subscribe(update => this.setState(update))
        }
        public componentDidMount(): void {
            containerComponentUpdates.next()
        }
        public componentDidUpdate(): void {
            containerComponentUpdates.next()
        }
        public render(): JSX.Element | null {
            return this.state.hoverOverlayProps ? (
                <HoverOverlay
                    {...this.state.hoverOverlayProps}
                    linkComponent={Link}
                    logTelemetryEvent={this.log}
                    hoverRef={nextOverlayElement}
                    onGoToDefinitionClick={nextGoToDefinitionClick}
                    onCloseButtonClick={nextCloseButtonClick}
                />
            ) : null
        }
        private log = () => eventLogger.logCodeIntelligenceEvent()
    }

    render(<HoverOverlayContainer />, overlayMount)

    return { hoverifier }
}

export interface CodeView extends CodeViewInfo {
    codeView: HTMLElement
}

function findCodeViews(codeViewInfos: CodeViewInfo[]): Observable<CodeView> {
    return new Observable<CodeView>(observer => {
        for (const info of codeViewInfos) {
            const elements = document.querySelectorAll<HTMLElement>(info.selector)
            for (const codeView of elements) {
                observer.next({ ...info, codeView })
            }
        }
    })
}

export function injectCodeIntelligence(codeHostInfo: CodeHostInfo): Subscription {
    const { hoverifier } = createCodeIntelligenceContainer(codeHostInfo)

    return findCodeViews(codeHostInfo.codeViews).subscribe(
        ({ codeView, dom, resolveFileInfo, adjustPosition, getToolbarMount, toolbarButtonProps }) =>
            resolveFileInfo(codeView).subscribe(info => {
                const resolveContext: ContextResolver = ({ part }) => ({
                    repoPath: part === 'base' ? info.baseRepoPath || info.repoPath : info.repoPath,
                    commitID: part === 'base' ? info.baseCommitID! : info.commitID,
                    filePath: part === 'base' ? info.baseFilePath! : info.filePath,
                    rev: part === 'base' ? info.baseRev || info.baseCommitID! : info.rev || info.commitID,
                })

                hoverifier.hoverify({
                    dom,
                    positionEvents: of(codeView).pipe(findPositionsFromEvents(dom)),
                    resolveContext,
                    adjustPosition,
                })

                if (!getToolbarMount) {
                    return
                }

                const mount = getToolbarMount(codeView)
                render(
                    <CodeViewToolbar
                        {...info}
                        buttonProps={
                            toolbarButtonProps || {
                                className: '',
                                style: {},
                            }
                        }
                        simpleCXPFns={lspViaAPIXlang}
                    />,
                    mount
                )
            })
    )
}
