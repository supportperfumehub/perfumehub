import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { authenticateUser, verifyRole } from '../middleware/auth.js';

const router = express.Router();

const adminOnly = [authenticateUser, verifyRole(['super_admin', 'admin'])];

// Get all backups
router.get('/', adminOnly, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('backups')
            .select('*')
            .order('deleted_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Restore from backup
router.post('/:id/restore', adminOnly, async (req, res) => {
    const { id } = req.params;
    try {
        const { data: backup, error: fetchError } = await supabase
            .from('backups')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;
        if (!backup) return res.status(404).json({ error: 'Backup not found' });

        const { table_name, data: recordData } = backup;

        const { error: restoreError } = await supabase
            .from(table_name)
            .upsert([recordData]);

        if (restoreError) throw restoreError;

        const { error: deleteBackupError } = await supabase
            .from('backups')
            .delete()
            .eq('id', id);

        if (deleteBackupError) throw deleteBackupError;

        res.json({ message: 'Successfully restored from backup' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', details: error.message || error });
    }
});

// Permanent Delete from backup
router.delete('/:id', adminOnly, async (req, res) => {
    const { id } = req.params;
    try {
        const { error, count } = await supabase
            .from('backups')
            .delete({ count: 'exact' })
            .eq('id', id);

        if (error) throw error;
        if (count === 0) return res.status(404).json({ error: 'Backup record not found' });

        res.json({ message: 'Record permanently deleted from backups' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
