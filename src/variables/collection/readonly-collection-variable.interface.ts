import { DeepReadonly } from 'frl-ts-utils/lib/types';
import { IReadonlyKeyedCollection } from 'frl-ts-utils/lib/collections';
import { IEvent } from 'frl-ts-utils/lib/events';
import { IVariable } from '../variable.interface';
import { ICollectionVariableChangeTracker } from './collection-variable-change-tracker.interface';
import { ICollectionVariableValidator } from './collection-variable-validator.interface';
import { CollectionVariableAddingElementsEvent } from './collection-variable-adding-elements-event';
import { CollectionVariableElementsAddedEvent } from './collection-variable-elements-added-event';
import { CollectionVariableRemovingElementsEvent } from './collection-variable-removing-elements-event';
import { CollectionVariableElementsRemovedEvent } from './collection-variable-elements-removed-event';
import { CollectionVariableReplacingElementsEvent } from './collection-variable-replacing-elements-event';
import { CollectionVariableElementsReplacedEvent } from './collection-variable-elements-replaced-event';
import { CollectionVariableSettingElementsEvent } from './collection-variable-setting-elements-event';
import { CollectionVariableElementsSetEvent } from './collection-variable-elements-set-event';
import { CollectionVariableRecreatingEvent } from './collection-variable-recreating-event';
import { CollectionVariableRecreatedEvent } from './collection-variable-recreated-event';
import { CollectionVariableRecreateCancelledEvent } from './collection-variable-recreate-cancelled-event';

export interface IReadonlyCollectionVariable<TKey = any, TElement = any>
    extends
    IVariable<IReadonlyKeyedCollection<TKey, TElement>>,
    Iterable<TElement>
{
    readonly elements: ReadonlyArray<TElement>;
    readonly changeTracker: ICollectionVariableChangeTracker<TKey, TElement>;
    readonly validator: ICollectionVariableValidator<TKey, TElement>;
    readonly isAutoDisposing: boolean;

    readonly onAddingElements: IEvent<CollectionVariableAddingElementsEvent<TKey, TElement>>;
    readonly onElementsAdded: IEvent<CollectionVariableElementsAddedEvent<TKey, TElement>>;
    readonly onRemovingElements: IEvent<CollectionVariableRemovingElementsEvent<TKey, TElement>>;
    readonly onElementsRemoved: IEvent<CollectionVariableElementsRemovedEvent<TKey, TElement>>;
    readonly onReplacingElements: IEvent<CollectionVariableReplacingElementsEvent<TKey, TElement>>;
    readonly onElementsReplaced: IEvent<CollectionVariableElementsReplacedEvent<TKey, TElement>>;
    readonly onSettingElements: IEvent<CollectionVariableSettingElementsEvent<TKey, TElement>>;
    readonly onElementsSet: IEvent<CollectionVariableElementsSetEvent<TKey, TElement>>;
    readonly onRecreating: IEvent<CollectionVariableRecreatingEvent<TKey, TElement>>;
    readonly onRecreated: IEvent<CollectionVariableRecreatedEvent<TKey, TElement>>;
    readonly onRecreateCancelled: IEvent<CollectionVariableRecreateCancelledEvent<TKey, TElement>>;

    getIndex(element: DeepReadonly<TElement>): number;
    getIndexByKey(key: DeepReadonly<TKey>): number;
}
