import { LoadingSpinner } from '@sourcegraph/react-loading-spinner'
import * as querystring from 'query-string'
import * as React from 'react'
import { Button, FormGroup, Input, Label } from 'reactstrap'
import { Subscription } from 'rxjs'
import * as browserAction from '../../../extension/browserAction'
import { getURL } from '../../../extension/extension'
import * as management from '../../../extension/management'
import storage from '../../../extension/storage'
import { getExtensionVersion } from '../../util/context'
import { ConfigWarning } from './ConfigWarning'
import { PhabricatorSettings } from './PhabricatorSettings'
import { ServerConnection } from './ServerConnection'
import { ServerInstallation } from './ServerInstallation'
import { ServerModal } from './ServerModal'
import { SupportedCodeHosts } from './SupportedCodeHosts'
import { TelemetryBanner } from './TelemetryBanner'

interface State {
    inlineSymbolSearchEnabled: boolean
    renderMermaidGraphsEnabled: boolean
    repositoryFileTreeEnabled: boolean
    executeSearchEnabled: boolean
    displayHeader: boolean
    isPopup: boolean
    version: string
    extensionDisabled: boolean
    canShowDisableExtension: boolean
    useCXP: boolean
    clientSettings: string
    gitHubToken: { state: 'LOADING' | 'EDITING' | 'CONCEALED'; value: string }
}

// Make safari not be abnoxious <angry face>
const safariInputAttributes = {
    autoComplete: 'off',
    autoCorrect: 'off',
    autoCapitalize: 'off',
    spellCheck: false,
}

export class OptionsPage extends React.Component<{}, State> {
    public state: State
    private subscriptions = new Subscription()

    constructor(props: any) {
        super(props)

        const search = window.location.search
        const params = querystring.parse(search)

        this.state = {
            inlineSymbolSearchEnabled: false,
            renderMermaidGraphsEnabled: false,
            repositoryFileTreeEnabled: false,
            executeSearchEnabled: false,
            displayHeader: params.popup || params.fullPage,
            isPopup: params.popup,
            version: '',
            extensionDisabled: false,
            canShowDisableExtension: false,
            useCXP: false,
            clientSettings: '',
            gitHubToken: { state: 'LOADING', value: '' },
        }
    }

    public componentDidMount(): void {
        browserAction.setBadgeText({ text: '' })
        management.getSelf(extensionInfo => {
            storage.getSync(items => {
                this.setState({
                    inlineSymbolSearchEnabled: items.inlineSymbolSearchEnabled || false,
                    renderMermaidGraphsEnabled: items.renderMermaidGraphsEnabled || false,
                    repositoryFileTreeEnabled:
                        items.repositoryFileTreeEnabled === undefined || items.repositoryFileTreeEnabled,
                    executeSearchEnabled: items.executeSearchEnabled === undefined || items.executeSearchEnabled,
                    extensionDisabled: items.disableExtension,
                    canShowDisableExtension: !!extensionInfo && !extensionInfo.mayDisable,
                    useCXP: items.useCXP,
                    clientSettings: items.clientSettings,
                    gitHubToken:
                        items.gitHubToken && items.gitHubToken !== ''
                            ? { state: 'CONCEALED', value: items.gitHubToken }
                            : { state: 'EDITING', value: '' },
                })
            })
        })

        getExtensionVersion()
            .then(version => this.setState({ version }))
            .catch(() => this.setState({ version: '' }))

        this.subscriptions.add(
            storage
                .observeSync('gitHubToken')
                .subscribe(gitHubToken =>
                    this.setState(() => ({ gitHubToken: { state: 'CONCEALED', value: gitHubToken } }))
                )
        )
    }

    public componentWillUnmount(): void {
        this.subscriptions.unsubscribe()
    }

    private onExtensionDisabledToggled = () => {
        storage.setSync({ disableExtension: !this.state.extensionDisabled }, () => {
            this.setState(() => ({ extensionDisabled: !this.state.extensionDisabled }))
        })
    }

    private onFileTreeToggled = () => {
        storage.setSync({ repositoryFileTreeEnabled: !this.state.repositoryFileTreeEnabled }, () => {
            this.setState(() => ({ repositoryFileTreeEnabled: !this.state.repositoryFileTreeEnabled }))
        })
    }

    private onExecuteSearchToggled = () => {
        storage.setSync({ executeSearchEnabled: !this.state.executeSearchEnabled }, () => {
            this.setState(state => ({ executeSearchEnabled: !state.executeSearchEnabled }))
        })
    }

    private onMermaidToggled = () => {
        const renderMermaidGraphsEnabled = !this.state.renderMermaidGraphsEnabled
        storage.setSync({ renderMermaidGraphsEnabled }, () => {
            this.setState({ renderMermaidGraphsEnabled })
        })
    }

    private onInlineSymbolSearchToggled = () => {
        storage.setSync({ inlineSymbolSearchEnabled: !this.state.inlineSymbolSearchEnabled }, () => {
            this.setState(() => ({
                inlineSymbolSearchEnabled: !this.state.inlineSymbolSearchEnabled,
            }))
        })
    }

    private onUseCXPToggled = () => {
        const useCXP = !this.state.useCXP
        storage.setSync({ useCXP }, () => {
            this.setState({ useCXP })
        })
    }

    private gitHubTokenOnKeyPress = (e: React.KeyboardEvent<HTMLElement>): void => {
        if (this.state.gitHubToken.state === 'EDITING') {
            if (e.charCode === 13) {
                storage.setSync(
                    {
                        gitHubToken: this.state.gitHubToken.value,
                    },
                    () => this.setState(() => ({ gitHubToken: { ...this.state.gitHubToken, state: 'CONCEALED' } }))
                )
            }
        }
    }

    private gitHubTokenInputChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.persist()
        if (this.state.gitHubToken.state === 'EDITING') {
            this.setState(() => ({ gitHubToken: { ...this.state.gitHubToken, value: e.target.value } }))
        }
    }

    private editGitHubToken = () => {
        this.setState(() => ({ gitHubToken: { ...this.state.gitHubToken, state: 'EDITING' } }))
    }

    public render(): JSX.Element | null {
        const { version } = this.state
        return (
            <div className={`options__container ${!this.state.isPopup ? 'options__container-full' : ''}`}>
                <ServerModal />
                <div>
                    {this.state.displayHeader && (
                        <div className="options__overlay-header">
                            <div className="options__overlay-container">
                                <img
                                    className="options__overlay-icon"
                                    src={getURL('img/sourcegraph-light-head-logo.svg')}
                                />
                            </div>
                            {version !== 'NO_VERSION' && <div className="options__version">v{version}</div>}
                        </div>
                    )}
                    {this.state.canShowDisableExtension && (
                        <div>
                            <div className="options__section">
                                <div className="options__section-contents">
                                    <FormGroup check={true}>
                                        <Label className="options__input">
                                            <Input
                                                onClick={this.onExtensionDisabledToggled}
                                                checked={Boolean(this.state.extensionDisabled)}
                                                className="options__input-checkbox"
                                                type="checkbox"
                                                {...safariInputAttributes as any}
                                            />{' '}
                                            <div className="options__input-label">Disable extension.</div>
                                        </Label>
                                    </FormGroup>
                                </div>
                            </div>
                            <div className="options__divider" />
                        </div>
                    )}
                    <div className="options__section">
                        <div className="options__section-header">Search</div>
                        <div className="options__section-contents">
                            <FormGroup check={true}>
                                <Label className="options__input">
                                    <Input
                                        onClick={this.onExecuteSearchToggled}
                                        checked={Boolean(this.state.executeSearchEnabled)}
                                        className="options__input-checkbox"
                                        type="checkbox"
                                        {...safariInputAttributes as any}
                                    />{' '}
                                    <div className="options__input-label">
                                        Open a new window with Sourcegraph search results when you perform a search on
                                        your code host.
                                    </div>
                                </Label>
                            </FormGroup>
                        </div>
                    </div>
                    <div className="options__divider" />
                    <div className="options__section">
                        <div className="options__section-header">Navigation</div>
                        <div className="options__section-contents">
                            <FormGroup check={true}>
                                <Label className="options__input">
                                    <Input
                                        onClick={this.onFileTreeToggled}
                                        checked={Boolean(this.state.repositoryFileTreeEnabled)}
                                        className="options__input-checkbox"
                                        type="checkbox"
                                        {...safariInputAttributes as any}
                                    />{' '}
                                    <div className="options__input-label">Display repository file tree navigation.</div>
                                </Label>
                            </FormGroup>
                        </div>
                    </div>
                    <div className="options__divider" />
                    <div className="options__section options__section-borderless">
                        <ConfigWarning />
                    </div>
                    <ServerConnection />
                </div>
                <div className="options__divider" />
                <div className="options__section">
                    <SupportedCodeHosts />
                </div>
                <div className="options__divider" />
                <div className="options__section">
                    <div className="options__section-header">Phabricator Settings</div>
                    <PhabricatorSettings />
                </div>
                <div className="options__section">
                    <div className="options__section-header">GitHub token</div>
                    {this.state.gitHubToken.state === 'LOADING' ? (
                        <LoadingSpinner />
                    ) : this.state.gitHubToken.state === 'EDITING' ? (
                        <Input
                            value={this.state.gitHubToken.value}
                            onKeyPress={this.gitHubTokenOnKeyPress}
                            onChange={this.gitHubTokenInputChanged}
                            className="options__input-field"
                            type="text"
                        />
                    ) : (
                        <Button className="options__button-icon-add" onClick={this.editGitHubToken} size="sm">
                            Set GitHub token
                        </Button>
                    )}
                    <PhabricatorSettings />
                </div>
                <ServerInstallation />
                <div className="options__divider" />
                <div className="options__section">
                    <div className="options__section-header">Experimental Features</div>
                    <div className="options__section-contents">
                        <FormGroup check={true}>
                            <Label className="options__input">
                                <Input
                                    onClick={this.onMermaidToggled}
                                    checked={Boolean(this.state.renderMermaidGraphsEnabled)}
                                    className="options__input-checkbox"
                                    type="checkbox"
                                    {...safariInputAttributes as any}
                                />{' '}
                                <div className="options__input-label">
                                    Render{' '}
                                    <a
                                        href="https://mermaidjs.github.io/"
                                        target="_blank"
                                        // tslint:disable-next-line jsx-no-lambda
                                        onClick={e => e.stopPropagation()}
                                        rel="noopener"
                                        className="options__alert-link"
                                    >
                                        mermaid.js
                                    </a>{' '}
                                    diagrams on GitHub markdown files
                                </div>
                            </Label>
                            <Label className="options__input">
                                <Input
                                    onClick={this.onUseCXPToggled}
                                    checked={Boolean(this.state.useCXP)}
                                    className="options__input-checkbox"
                                    type="checkbox"
                                    {...safariInputAttributes as any}
                                />{' '}
                                <div className="options__input-label">Enable CXP</div>
                            </Label>
                        </FormGroup>
                        <FormGroup check={true}>
                            <Label className="options__input">
                                <Input
                                    onClick={this.onInlineSymbolSearchToggled}
                                    checked={Boolean(this.state.inlineSymbolSearchEnabled)}
                                    className="options__input-checkbox"
                                    type="checkbox"
                                    {...safariInputAttributes as any}
                                />{' '}
                                <div className="options__input-label">
                                    Enable inline symbol search by typing <code>!symbolQueryText</code> inside of GitHub
                                    PR comments (requires reload after toggling)
                                </div>
                            </Label>
                        </FormGroup>
                    </div>
                </div>
                <div className="options__divider" />
                <div className="options__section">
                    <TelemetryBanner />
                </div>
            </div>
        )
    }
}
