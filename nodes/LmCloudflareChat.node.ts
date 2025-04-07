/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { type INodeType, type INodeTypeDescription, type SupplyData } from 'n8n-workflow';

import { ChatCloudflareWorkersAI } from '@langchain/cloudflare';
import { N8nLlmTracing } from './N8NLlmTracing';
import { makeN8nLlmFailedAttemptHandler } from './n8nLlmFaildAttemptHandler';
import { getConnectionHintNoticeField, NodeConnectionTypes } from './utils';

export class LmCloudflareChat implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cloudflare Chat Model',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-name-miscased
		name: 'lmChatCloudflare',
		icon: 'file:cloudflare-svgrepo-com.svg',
		group: ['transform'],
		version: 1,
		description: 'Language Model Cloudflare',
		defaults: {
			name: 'Cloudflare Chat Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatgroq/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionTypes.AiLanguageModel] as any,
		outputNames: ['Model'],
		credentials: [
			{
				name: 'cloudflareApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '=https://api.cloudflare.com/client/v4/accounts/{{$credentials.accountId}}',
		},
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				typeOptions: {
					loadOptions: {
						routing: {
							request: {
								method: 'GET',
								url: '/ai/models/search',
							},
							output: {
								postReceive: [
									{
										type: 'rootProperty',
										properties: {
											property: 'result',
										},
									},
									// {
									// 	type: 'filter',
									// 	properties: {
									// 		pass: '={{ $responseItem.active === true && $responseItem.object === "model" }}',
									// 	},
									// },
									{
										type: 'setKeyValue',
										properties: {
											name: '={{$responseItem.name}}',
											value: '={{$responseItem.name}}',
										},
									},
								],
							},
						},
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'model',
					},
				},
				description:
					'The model which will generate the completion. <a href="https://console.groq.com/docs/models">Learn more</a>.',
				default: '',
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options to add',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Maximum Number of Tokens',
						name: 'maxTokensToSample',
						default: 4096,
						description: 'The maximum number of tokens to generate in the completion',
						type: 'number',
					},
					{
						displayName: 'Sampling Temperature',
						name: 'temperature',
						default: 0.7,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
						description:
							'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
						type: 'number',
					},
				],
			},
		],
	};

	async supplyData(this: any, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('cloudflareApi');

		const modelName = this.getNodeParameter('model', itemIndex) as string;
		// const options = this.getNodeParameter('options', itemIndex, {}) as {
		// 	maxTokensToSample?: number;
		// 	temperature: number;
		// };

		const model = new ChatCloudflareWorkersAI({
			model: modelName,
			cloudflareAccountId: credentials.accountId as string,
			cloudflareApiToken: credentials.apiKey as string,
			callbacks: [new N8nLlmTracing(this)],
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this),
		});

		return {
			response: model,
		};
	}
}
