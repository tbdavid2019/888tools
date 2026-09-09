<script lang="ts" setup>
import _ from 'lodash';

const props = withDefaults(defineProps<{
  multiple?: boolean
  accept?: string
  title?: string
}>(), {
  multiple: false,
  accept: undefined,
  title: 'Drag and drop files here, or click to select files',
});

const emit = defineEmits<{
  (event: 'filesUpload', files: File[]): void
  (event: 'fileUpload', file: File): void
}>();

const { multiple } = toRefs(props);

const isOverDropZone = ref(false);
let dragCounter = 0;

const fileInput = ref<HTMLInputElement | null>(null);

function triggerFileInput() {
  fileInput.value?.click();
}

function handleFileInput(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = input.files;
  handleUpload(files);
  input.value = '';
}

function onDragEnter(event: DragEvent) {
  event.preventDefault();
  dragCounter++;
  isOverDropZone.value = true;
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
}

function onDragLeave(event: DragEvent) {
  event.preventDefault();
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    isOverDropZone.value = false;
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  dragCounter = 0;
  isOverDropZone.value = false;
  const files = event.dataTransfer?.files;

  handleUpload(files);
}

function handleUpload(files: FileList | null | undefined) {
  if (_.isNil(files) || _.isEmpty(files)) {
    return;
  }

  if (multiple.value) {
    emit('filesUpload', Array.from(files));
    return;
  }

  emit('fileUpload', files[0]);
}
</script>

<template>
  <div
    class="flex flex-col cursor-pointer items-center justify-center border-2px border-gray-300 dark:border-zinc-700 border-opacity-50 rounded-xl border-dashed p-8 transition-all duration-200"
    :class="{
      'border-primary border-opacity-100 bg-primary/10 shadow-sm scale-[1.008] ring-2 ring-primary/20': isOverDropZone,
      'hover:border-primary hover:bg-gray-50/50 dark:hover:bg-zinc-800/20': !isOverDropZone,
    }"
    @click="triggerFileInput"
    @dragenter="onDragEnter"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="handleDrop"
  >
    <input
      ref="fileInput"
      type="file"
      class="hidden"
      :multiple="multiple"
      :accept="accept"
      @change="handleFileInput"
    >
    <div class="flex flex-col items-center justify-center w-full pointer-events-none">
      <slot>
        <span op-70 class="text-center font-medium">
          {{ title }}
        </span>

        <!-- separator -->
        <div my-4 w-full flex items-center justify-center op-70>
          <div class="h-1px max-w-100px flex-1 bg-gray-300 dark:bg-zinc-700 op-50" />
          <div class="mx-2 text-gray-400 text-xs uppercase tracking-wider">
            or
          </div>
          <div class="h-1px max-w-100px flex-1 bg-gray-300 dark:bg-zinc-700 op-50" />
        </div>

        <c-button class="pointer-events-auto">
          Browse files
        </c-button>
      </slot>
    </div>
  </div>
</template>
