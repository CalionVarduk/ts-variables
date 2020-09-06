import { DeepReadonly, Stringifier, toDeepReadonly, Nullable } from 'frl-ts-utils/lib/types';
import { isDefined, reinterpretCast, isNull, isInstanceOfType, deepReadonlyCast } from 'frl-ts-utils/lib/functions';
import { KeySelector, Iteration, UnorderedMap, KeyedCollection, IReadonlyKeyedCollection } from 'frl-ts-utils/lib/collections';
import { EventHandler, IEvent } from 'frl-ts-utils/lib/events';
import { isDisposable } from 'frl-ts-utils/lib/disposable.interface';
import { CollectionVariableValidator } from './collection-variable-validator';
import { CollectionVariableChangeTracker } from './collection-variable-change-tracker';
import { VariableBase } from '../variable-base.abstract';
import { ICollectionVariable } from './collection-variable.interface';
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
import { UpdateRef } from '../../update-ref';
import { CollectionVariableRecreationSource } from './collection-variable-recreation-source.enum';
import { CollectionVariableRecreateCancellationReason } from './collection-variable-recreate-cancellation-reason.enum';

class IndexedCollection<TKey, TElement>
{
    public get lookup(): IReadonlyKeyedCollection<TKey, TElement>
    {
        return this._lookup;
    }

    public get all(): ReadonlyArray<TElement>
    {
        return this._all;
    }

    private _lookup: KeyedCollection<TKey, TElement>;
    private readonly _all: TElement[];
    private readonly _indexer: UnorderedMap<TKey, number>;

    public constructor(params: CollectionVariableValueParams<TKey, TElement>)
    {
        this._lookup = new KeyedCollection<TKey, TElement>(
            isDefined(params.name) && params.name.length > 0 ? params.name : 'elements',
            params.keySelector,
            params.keyStringifier);

        if (isDefined(params.lookups))
            for (const lookup of params.lookups)
                this._lookup.addLookup(lookup.name, lookup.keySelector, lookup.keyStringifier);

        this._all = [];
        this._indexer = new UnorderedMap<TKey, number>(params.keyStringifier);
    }

    public getKey(element: TElement): DeepReadonly<TKey>
    {
        return this._lookup.primaryLookup.getEntityKey(toDeepReadonly(element));
    }

    public has(element: TElement): boolean
    {
        return this._lookup.has(toDeepReadonly(element));
    }

    public tryGet(element: TElement): Nullable<TElement>
    {
        const key = this.getKey(element);
        return this._lookup.tryGet(key);
    }

    public getIndex(element: DeepReadonly<TElement>): number
    {
        const key = this.getKey(deepReadonlyCast(element));
        const index = this._indexer.tryGet(key);
        return isNull(index) ? -1 : index;
    }

    public addRange(range: Iterable<TElement>): TElement[]
    {
        const added = Iteration.ToArray(this._lookup.tryAddRange(range));

        for (const element of added)
        {
            const key = this.getKey(element);
            const index = this._all.length;
            this._all.push(element);
            this._indexer.set(key, index);
        }
        return added;
    }

    public removeRange(range: Iterable<TElement>): TElement[]
    {
        const removed = Iteration.ToArray(this._lookup.tryDeleteRange(Iteration.AsDeepReadonly(range)));
        if (removed.length === 0)
            return removed;

        const removedIndices = removed.map(e =>
            {
                const key = this.getKey(e);
                return this._indexer.get(key);
            })
            .sort((a, b) => a - b);

        for (const element of removed)
        {
            const key = this.getKey(element);
            this._indexer.delete(key);
        }

        let removedIndicesIndex = 0;
        let indexToMoveTo = removedIndices[removedIndicesIndex];

        while (removedIndicesIndex < removedIndices.length)
        {
            const indexToMoveFrom = removedIndices[removedIndicesIndex] + 1;
            const nextRemovedIndicesIndex = removedIndicesIndex + 1;

            const moveCount = (
                nextRemovedIndicesIndex >= removedIndices.length ?
                    this._all.length :
                    removedIndices[nextRemovedIndicesIndex]
                ) - indexToMoveFrom;

            for (let i = 0; i < moveCount; ++i)
            {
                const newPersistedIndex = indexToMoveTo + i;
                const persisted = this._all[indexToMoveFrom + i];
                const key = this.getKey(persisted);
                this._indexer.set(key, newPersistedIndex);
                this._all[newPersistedIndex] = persisted;
            }
            removedIndicesIndex = nextRemovedIndicesIndex;
            indexToMoveTo += moveCount;
        }
        this._all.splice(this._all.length - removedIndices.length);

        return removed;
    }

    public replaceRange(range: Iterable<UpdateRef<TElement>>): UpdateRef<TElement>[]
    {
        const replaced = Iteration.ToArray(
            Iteration.Unique(range, e =>
                {
                    const key = this.getKey(reinterpretCast<TElement>(e.value));
                    return this._lookup.primaryLookup.keyStringifier(key);
                }));

        if (replaced.length === 0)
            return replaced;

        this._lookup.deleteRange(
            Iteration.Map(replaced, e => toDeepReadonly(e.oldValue)));

        this._lookup.tryAddRange(
            Iteration.Map(replaced, e => e.value));

        for (const element of replaced)
        {
            const key = this.getKey(element.value);
            const index = this._indexer.get(key);
            this._indexer.set(key, index);
            this._all[index] = element.value;
        }
        return replaced;
    }

    public update(collection: KeyedCollection<TKey, TElement>): void
    {
        this._indexer.clear();
        this._all.splice(0);
        this._lookup = collection;

        for (const element of collection.entities())
        {
            const key = this.getKey(element);
            const index = this._all.length;
            this._all.push(element);
            this._indexer.set(key, index);
        }
    }
}

export type CollectionVariableLookupParams<TKey = any, TElement = any> =
{
    readonly name: string;
    readonly keySelector: KeySelector<TKey, TElement>;
    readonly keyStringifier?: Stringifier<TKey>;
};

export type CollectionVariableValueParams<TKey = any, TElement = any> =
{
    readonly name?: string;
    readonly keySelector: KeySelector<TKey, TElement>;
    readonly keyStringifier?: Stringifier<TKey>;
    readonly lookups?: Iterable<CollectionVariableLookupParams<any, TElement>>;
};

export type CollectionVariableParams<TKey = any, TElement = any> =
{
    readonly changeTracker?: CollectionVariableChangeTracker<TKey, TElement>;
    readonly validator?: CollectionVariableValidator<TKey, TElement>;
    readonly value?: Iterable<TElement>;
    readonly autoDispose?: boolean;
    readonly collection: CollectionVariableValueParams<TKey, TElement>;
    elementResetMapper?(value: DeepReadonly<TElement>): TElement;
};

export class CollectionVariable<TKey = any, TElement = any>
    extends
    VariableBase<IReadonlyKeyedCollection<TKey, TElement>>
    implements
    ICollectionVariable<TKey, TElement>
{
    public get value(): IReadonlyKeyedCollection<TKey, TElement>
    {
        return this._data.lookup;
    }

    public get elements(): ReadonlyArray<TElement>
    {
        return this._data.all;
    }

    public get changeTracker(): CollectionVariableChangeTracker<TKey, TElement>
    {
        return reinterpretCast<CollectionVariableChangeTracker<TKey, TElement>>(super.changeTracker);
    }

    public get validator(): CollectionVariableValidator<TKey, TElement>
    {
        return reinterpretCast<CollectionVariableValidator<TKey, TElement>>(super.validator);
    }

    public get onAddingElements(): IEvent<CollectionVariableAddingElementsEvent<TKey, TElement>>
    {
        return this._onAddingElements;
    }

    public get onElementsAdded(): IEvent<CollectionVariableElementsAddedEvent<TKey, TElement>>
    {
        return this._onElementsAdded;
    }

    public get onRemovingElements(): IEvent<CollectionVariableRemovingElementsEvent<TKey, TElement>>
    {
        return this._onRemovingElements;
    }

    public get onElementsRemoved(): IEvent<CollectionVariableElementsRemovedEvent<TKey, TElement>>
    {
        return this._onElementsRemoved;
    }

    public get onReplacingElements(): IEvent<CollectionVariableReplacingElementsEvent<TKey, TElement>>
    {
        return this._onReplacingElements;
    }

    public get onElementsReplaced(): IEvent<CollectionVariableElementsReplacedEvent<TKey, TElement>>
    {
        return this._onElementsReplaced;
    }

    public get onSettingElements(): IEvent<CollectionVariableSettingElementsEvent<TKey, TElement>>
    {
        return this._onSettingElements;
    }

    public get onElementsSet(): IEvent<CollectionVariableElementsSetEvent<TKey, TElement>>
    {
        return this._onElementsSet;
    }

    public get onRecreating(): IEvent<CollectionVariableRecreatingEvent<TKey, TElement>>
    {
        return this._onRecreating;
    }

    public get onRecreated(): IEvent<CollectionVariableRecreatedEvent<TKey, TElement>>
    {
        return this._onRecreated;
    }

    public get onRecreateCancelled(): IEvent<CollectionVariableRecreateCancelledEvent<TKey, TElement>>
    {
        return this._onRecreateCancelled;
    }

    public readonly isAutoDisposing: boolean;

    protected readonly elementResetMapper: (original: DeepReadonly<TElement>) => TElement;

    private readonly _onAddingElements: EventHandler<CollectionVariableAddingElementsEvent<TKey, TElement>>;
    private readonly _onElementsAdded: EventHandler<CollectionVariableElementsAddedEvent<TKey, TElement>>;
    private readonly _onRemovingElements: EventHandler<CollectionVariableRemovingElementsEvent<TKey, TElement>>;
    private readonly _onElementsRemoved: EventHandler<CollectionVariableElementsRemovedEvent<TKey, TElement>>;
    private readonly _onReplacingElements: EventHandler<CollectionVariableReplacingElementsEvent<TKey, TElement>>;
    private readonly _onElementsReplaced: EventHandler<CollectionVariableElementsReplacedEvent<TKey, TElement>>;
    private readonly _onSettingElements: EventHandler<CollectionVariableSettingElementsEvent<TKey, TElement>>;
    private readonly _onElementsSet: EventHandler<CollectionVariableElementsSetEvent<TKey, TElement>>;
    private readonly _onRecreating: EventHandler<CollectionVariableRecreatingEvent<TKey, TElement>>;
    private readonly _onRecreated: EventHandler<CollectionVariableRecreatedEvent<TKey, TElement>>;
    private readonly _onRecreateCancelled: EventHandler<CollectionVariableRecreateCancelledEvent<TKey, TElement>>;

    private readonly _data: IndexedCollection<TKey, TElement>;

    public constructor(params: CollectionVariableParams<TKey, TElement>)
    {
        super(
            isDefined(params.changeTracker) ? params.changeTracker : new CollectionVariableChangeTracker<TKey, TElement>(),
            isDefined(params.validator) ? params.validator : new CollectionVariableValidator<TKey, TElement>());

        this._data = new IndexedCollection<TKey, TElement>(params.collection);
        if (isDefined(params.value))
            this._data.addRange(params.value);

        this.elementResetMapper = isDefined(params.elementResetMapper) ?
            params.elementResetMapper :
            e => reinterpretCast<TElement>(e);

        this.isAutoDisposing = isDefined(params.autoDispose) ? params.autoDispose : true;

        this._onAddingElements = new EventHandler<CollectionVariableAddingElementsEvent<TKey, TElement>>();
        this._onElementsAdded = new EventHandler<CollectionVariableElementsAddedEvent<TKey, TElement>>();
        this._onRemovingElements = new EventHandler<CollectionVariableRemovingElementsEvent<TKey, TElement>>();
        this._onElementsRemoved = new EventHandler<CollectionVariableElementsRemovedEvent<TKey, TElement>>();
        this._onReplacingElements = new EventHandler<CollectionVariableReplacingElementsEvent<TKey, TElement>>();
        this._onElementsReplaced = new EventHandler<CollectionVariableElementsReplacedEvent<TKey, TElement>>();
        this._onSettingElements = new EventHandler<CollectionVariableSettingElementsEvent<TKey, TElement>>();
        this._onElementsSet = new EventHandler<CollectionVariableElementsSetEvent<TKey, TElement>>();
        this._onRecreating = new EventHandler<CollectionVariableRecreatingEvent<TKey, TElement>>();
        this._onRecreated = new EventHandler<CollectionVariableRecreatedEvent<TKey, TElement>>();
        this._onRecreateCancelled = new EventHandler<CollectionVariableRecreateCancelledEvent<TKey, TElement>>();

        this.changeTracker.configure(this);
        this.validator.configure(this);
    }

    public dispose(): void
    {
        if (this.isDisposed)
            return;

        this._onAddingElements.dispose();
        this._onElementsAdded.dispose();
        this._onRemovingElements.dispose();
        this._onElementsRemoved.dispose();
        this._onReplacingElements.dispose();
        this._onElementsReplaced.dispose();
        this._onSettingElements.dispose();
        this._onElementsSet.dispose();
        this._onRecreating.dispose();
        this._onRecreated.dispose();
        this._onRecreateCancelled.dispose();

        for (const element of this._data.all)
            this._tryAutoDisposeElement(element);

        super.dispose();
    }

    public getIndex(element: DeepReadonly<TElement>): number
    {
        return this._data.getIndex(element);
    }

    public add(elements: Iterable<TElement>): void
    {
        const materializedElements = isInstanceOfType<Array<TElement>>(Array, elements) ? elements : Iteration.ToArray(elements);
        if (materializedElements.length === 0)
            return;

        const cancellableEvent = new CollectionVariableAddingElementsEvent<TKey, TElement>(
            this.changeTracker.originalValue, this._data.lookup, materializedElements);

        this.publishAddingElements(cancellableEvent);

        const addedElements = this._data.addRange(cancellableEvent.getAcceptedElements());
        if (addedElements.length === 0)
            return;

        const event = new CollectionVariableElementsAddedEvent<TKey, TElement>(
            cancellableEvent, addedElements);

        this.publishElementsAdded(event);
    }

    public remove(elements: Iterable<TElement>): void
    {
        const materializedElements = isInstanceOfType<Array<TElement>>(Array, elements) ? elements : Iteration.ToArray(elements);
        if (materializedElements.length === 0)
            return;

        const cancellableEvent = new CollectionVariableRemovingElementsEvent<TKey, TElement>(
            this.changeTracker.originalValue, this._data.lookup, materializedElements);

        this.publishRemovingElements(cancellableEvent);

        const removedElements = this._data.removeRange(cancellableEvent.getAcceptedElements());
        if (removedElements.length === 0)
            return;

        for (const element of removedElements)
            this._tryAutoDisposeElement(element);

        const event = new CollectionVariableElementsRemovedEvent<TKey, TElement>(
            cancellableEvent, removedElements);

        this.publishElementsRemoved(event);
    }

    public replace(elements: Iterable<TElement>): void
    {
        const materializedElements = Iteration.ToArray(
            Iteration.FilterNotNull(
                Iteration.Map(elements, e =>
                    {
                        const existingElement = this._data.tryGet(e);

                        return isNull(existingElement) ||
                            this.changeTracker.areElementsEqual(toDeepReadonly(e), toDeepReadonly(existingElement)) ?
                            null :
                            new UpdateRef<TElement>(e, existingElement);
                    })));

        if (materializedElements.length === 0)
            return;

        const cancellableEvent = new CollectionVariableReplacingElementsEvent<TKey, TElement>(
            this.changeTracker.originalValue, this._data.lookup, materializedElements);

        this.publishReplacingElements(cancellableEvent);

        const replacedElements = this._data.replaceRange(cancellableEvent.getAcceptedElements());
        if (replacedElements.length === 0)
            return;

        for (const element of replacedElements)
            this._tryAutoDisposeElement(element.oldValue);

        const event = new CollectionVariableElementsReplacedEvent<TKey, TElement>(
            cancellableEvent, replacedElements);

        this.publishElementsReplaced(event);
    }

    public set(elements: Iterable<TElement>): void
    {
        const materializedElementsToAdd = Iteration.ToArray(
            Iteration.Filter(elements, e => !this._data.has(e)));

        const materializedElementsToReplace = Iteration.ToArray(
            Iteration.FilterNotNull(
                Iteration.Map(
                    elements, e =>
                    {
                        const existingElement = this._data.tryGet(e);

                        return isNull(existingElement) ||
                            this.changeTracker.areElementsEqual(toDeepReadonly(e), toDeepReadonly(existingElement)) ?
                            null :
                            new UpdateRef<TElement>(e, existingElement);
                    })));

        if (materializedElementsToAdd.length === 0 && materializedElementsToReplace.length === 0)
            return;

        const cancellableEvent = new CollectionVariableSettingElementsEvent<TKey, TElement>(
            this.changeTracker.originalValue, this._data.lookup, materializedElementsToAdd, materializedElementsToReplace);

        this.publishSettingElements(cancellableEvent);

        const replacedElements = this._data.replaceRange(cancellableEvent.getAcceptedElementsToReplace());
        const addedElements = this._data.addRange(cancellableEvent.getAcceptedElementsToAdd());

        if (replacedElements.length === 0 && addedElements.length === 0)
            return;

        for (const element of replacedElements)
            this._tryAutoDisposeElement(element.oldValue);

        const event = new CollectionVariableElementsSetEvent<TKey, TElement>(
            cancellableEvent, addedElements, replacedElements);

        this.publishElementsSet(event);
    }

    public reset(): void
    {
        const value = KeyedCollection.CloneSchema(this._data.lookup);
        value.tryAddRange(
            Iteration.Map(
                this.changeTracker.originalValue.entities(),
                e => this.elementResetMapper(toDeepReadonly(e))));

        this.setValue(value, CollectionVariableRecreationSource.Reset);
    }

    public tryRecreate(elements: Iterable<TElement>): boolean
    {
        const value = KeyedCollection.CloneSchema(this._data.lookup);
        value.tryAddRange(elements);

        if (this.changeTracker.areEqual(this._data.lookup, value))
        {
            const cancelledEvent = new CollectionVariableRecreateCancelledEvent<TKey, TElement>(
                this.changeTracker.originalValue,
                this._data.lookup,
                value,
                CollectionVariableRecreateCancellationReason.EqualityComparison);

            this.publishRecreateCancelled(cancelledEvent);
            return false;
        }

        const cancellableEvent = new CollectionVariableRecreatingEvent<TKey, TElement>(
            this._data.lookup, value, this.changeTracker);

        this.publishRecreating(cancellableEvent);

        if (cancellableEvent.cancel)
        {
            const cancelledEvent = new CollectionVariableRecreateCancelledEvent<TKey, TElement>(
                this.changeTracker.originalValue,
                this._data.lookup,
                value,
                CollectionVariableRecreateCancellationReason.OnRecreatingEvent);

            this.publishRecreateCancelled(cancelledEvent);
            return false;
        }

        this.setValue(value, CollectionVariableRecreationSource.TryRecreate);
        return true;
    }

    public recreate(elements: Iterable<TElement>): void
    {
        const value = KeyedCollection.CloneSchema(this._data.lookup);
        value.tryAddRange(elements);
        this.setValue(value, CollectionVariableRecreationSource.Recreate);
    }

    public clear(): void
    {
        if (this._data.lookup.length === 0)
            return;

        const value = KeyedCollection.CloneSchema(this._data.lookup);
        this.setValue(value, CollectionVariableRecreationSource.Clear);
    }

    public [Symbol.iterator](): Iterator<TElement>
    {
        return this.elements[Symbol.iterator]();
    }

    protected setValue(value: KeyedCollection<TKey, TElement>, changeSource: CollectionVariableRecreationSource): void
    {
        const previousCollection = this._data.lookup;

        for (const element of this._data.all)
            this._tryAutoDisposeElement(element);

        this._data.update(value);

        const event = new CollectionVariableRecreatedEvent<TKey, TElement>(
            previousCollection,
            this._data.lookup,
            changeSource,
            this.changeTracker);

        this.publishRecreated(event);
    }

    protected publishAddingElements(e: CollectionVariableAddingElementsEvent<TKey, TElement>): void
    {
        this._onAddingElements.publish(this, e);
    }

    protected publishElementsAdded(e: CollectionVariableElementsAddedEvent<TKey, TElement>): void
    {
        this._onElementsAdded.publish(this, e);
    }

    protected publishRemovingElements(e: CollectionVariableRemovingElementsEvent<TKey, TElement>): void
    {
        this._onRemovingElements.publish(this, e);
    }

    protected publishElementsRemoved(e: CollectionVariableElementsRemovedEvent<TKey, TElement>): void
    {
        this._onElementsRemoved.publish(this, e);
    }

    protected publishReplacingElements(e: CollectionVariableReplacingElementsEvent<TKey, TElement>): void
    {
        this._onReplacingElements.publish(this, e);
    }

    protected publishElementsReplaced(e: CollectionVariableElementsReplacedEvent<TKey, TElement>): void
    {
        this._onElementsReplaced.publish(this, e);
    }

    protected publishSettingElements(e: CollectionVariableSettingElementsEvent<TKey, TElement>): void
    {
        this._onSettingElements.publish(this, e);
    }

    protected publishElementsSet(e: CollectionVariableElementsSetEvent<TKey, TElement>): void
    {
        this._onElementsSet.publish(this, e);
    }

    protected publishRecreating(e: CollectionVariableRecreatingEvent<TKey, TElement>): void
    {
        this._onRecreating.publish(this, e);
    }

    protected publishRecreateCancelled(e: CollectionVariableRecreateCancelledEvent<TKey, TElement>): void
    {
        this._onRecreateCancelled.publish(this, e);
    }

    protected publishRecreated(e: CollectionVariableRecreatedEvent<TKey, TElement>): void
    {
        this._onRecreated.publish(this, e);
    }

    private _tryAutoDisposeElement(element: TElement): void
    {
        if (!this.isAutoDisposing)
            return;

        if (isDisposable(element))
            element.dispose();
    }
}
