import { Response } from '@/lib/api/response';
import { Folder } from '@/lib/db/models/folder';
import { fetchApi } from '@/lib/fetchApi';
import { Button, Modal, Radio, Select, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconTrashFilled } from '@tabler/icons-react';
import { useState } from 'react';
import { mutate } from 'swr';
import useSWR from 'swr';

interface DeleteFolderModalProps {
  folder: Folder | null;
  opened: boolean;
  onClose: () => void;
}

type ChildrenAction = 'moveToRoot' | 'moveToFolder' | 'cascade';

export default function DeleteFolderModal({ folder, opened, onClose }: DeleteFolderModalProps) {
  const [loading, setLoading] = useState(false);
  const [childrenAction, setChildrenAction] = useState<ChildrenAction>('moveToRoot');
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);

  const { data: allFolders } = useSWR<Extract<Response['/api/user/folders'], Folder[]>>(
    opened ? '/api/user/folders?noincl=true' : null,
  );

  if (!folder) return null;

  const hasChildren = (folder._count?.children ?? 0) > 0;
  const hasFiles = (folder._count?.files ?? 0) > 0;
  const hasContent = hasChildren || hasFiles;

  const folderOptions =
    allFolders
      ?.filter((f) => f.id !== folder.id)
      .map((f) => ({
        value: f.id,
        label: f.name,
      })) ?? [];

  const handleDelete = async () => {
    setLoading(true);

    const body: any = {
      delete: 'folder',
    };

    if (hasContent) {
      body.childrenAction = childrenAction;
      if (childrenAction === 'moveToFolder') {
        if (!targetFolderId) {
          notifications.show({
            title: 'No folder selected',
            message: 'Please select a folder to move contents to',
            color: 'red',
          });
          setLoading(false);
          return;
        }
        body.targetFolderId = targetFolderId;
      }
    }

    const { error } = await fetchApi<Response['/api/user/folders/[id]']>(
      `/api/user/folders/${folder.id}`,
      'DELETE',
      body,
    );

    setLoading(false);

    if (error) {
      notifications.show({
        title: 'Failed to delete folder',
        message: error.error,
        color: 'red',
      });
    } else {
      notifications.show({
        title: 'Folder deleted',
        message: `${folder.name} has been deleted`,
        color: 'green',
      });
      mutate((key: string) => typeof key === 'string' && key.startsWith('/api/user/folders'));
      onClose();
    }
  };

  return (
    <Modal centered opened={opened} onClose={onClose} title={`Delete "${folder.name}"?`}>
      <Stack gap='sm'>
        <Text size='sm' c='red' fw={500}>
          This action cannot be undone.
        </Text>

        {hasContent && (
          <>
            <Text size='sm'>
              This folder contains {hasFiles && `${folder._count?.files} file(s)`}
              {hasChildren && hasFiles && ' and '}
              {hasChildren && `${folder._count?.children} subfolder(s)`}. What would you like to do with them?
            </Text>

            <Radio.Group value={childrenAction} onChange={(v) => setChildrenAction(v as ChildrenAction)}>
              <Stack gap='xs'>
                <Radio value='moveToRoot' label='Move contents to root folder' />
                <Radio value='moveToFolder' label='Move contents to another folder' />
                <Radio
                  value='cascade'
                  label={
                    <Text size='sm' c='red'>
                      Delete everything (cascade delete)
                    </Text>
                  }
                />
              </Stack>
            </Radio.Group>

            {childrenAction === 'moveToFolder' && (
              <Select
                label='Target Folder'
                placeholder='Select a folder'
                data={folderOptions}
                value={targetFolderId}
                onChange={(value) => setTargetFolderId(value)}
                searchable
                required
              />
            )}

            {childrenAction === 'cascade' && (
              <Text size='sm' c='red' fw={500}>
                Warning: This will permanently delete all subfolders and files within this folder.
              </Text>
            )}
          </>
        )}

        <Button
          onClick={handleDelete}
          loading={loading}
          leftSection={<IconTrashFilled size='1rem' />}
          color='red'
        >
          Delete Folder
        </Button>
      </Stack>
    </Modal>
  );
}
