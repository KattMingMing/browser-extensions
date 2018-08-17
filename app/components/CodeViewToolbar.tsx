import * as React from 'react'

import { SimpleCXPFns } from '../backend/lsp'
import { CodeIntelStatusIndicator } from './CodeIntelStatusIndicator'
import { OpenOnSourcegraph } from './OpenOnSourcegraph'

import { FileInfo } from '../code_intelligence/inject'

export interface ButtonProps {
    className: string
    style: React.CSSProperties
    iconStyle?: React.CSSProperties
}

interface CodeViewToolbarProps extends FileInfo {
    onEnabledChange?: (enabled: boolean) => void

    buttonProps: ButtonProps

    simpleCXPFns: SimpleCXPFns
}

export class CodeViewToolbar extends React.PureComponent<CodeViewToolbarProps> {
    public render(): JSX.Element | null {
        return (
            <div style={{ display: 'inline-flex', verticalAlign: 'middle', alignItems: 'center' }}>
                <CodeIntelStatusIndicator
                    key="code-intel-status"
                    userIsSiteAdmin={false}
                    repoPath={this.props.repoPath}
                    commitID={this.props.commitID}
                    filePath={this.props.filePath}
                    onChange={this.props.onEnabledChange}
                    simpleCXPFns={this.props.simpleCXPFns}
                />

                {this.props.baseCommitID &&
                    this.props.baseHasFileContents && (
                        <OpenOnSourcegraph
                            label={'View File (base)'}
                            ariaLabel="View file on Sourcegraph"
                            openProps={{
                                repoPath: this.props.baseRepoPath || this.props.repoPath,
                                filePath: this.props.baseFilePath || this.props.filePath,
                                rev: this.props.baseRev || this.props.baseCommitID,
                                query: {
                                    diff: {
                                        rev: this.props.baseCommitID,
                                    },
                                },
                            }}
                            className={this.props.buttonProps.className}
                            style={this.props.buttonProps.style}
                            iconStyle={this.props.buttonProps.iconStyle}
                        />
                    )}

                {!this.props.baseCommitID ||
                    (this.props.baseCommitID &&
                        this.props.headHasFileContents && (
                            <OpenOnSourcegraph
                                label={`View File${this.props.baseCommitID ? ' (head)' : ''}`}
                                ariaLabel="View file on Sourcegraph"
                                openProps={{
                                    repoPath: this.props.repoPath,
                                    filePath: this.props.filePath,
                                    rev: this.props.rev || this.props.commitID,
                                    query: this.props.commitID
                                        ? {
                                              diff: {
                                                  rev: this.props.commitID,
                                              },
                                          }
                                        : undefined,
                                }}
                                className={this.props.buttonProps.className}
                                style={this.props.buttonProps.style}
                                iconStyle={this.props.buttonProps.iconStyle}
                            />
                        ))}
            </div>
        )
    }
}
