import { Component, OnInit } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  Subject,
  catchError,
  map,
  of,
  startWith,
} from 'rxjs';
import { CustomHttpResponse } from './interface/custom-http-response';
import { AppState } from './interface/app-state';
import { Level } from './enum/level';
import { DataState } from './enum/data-state';
import { Note } from './interface/note';
import { NoteService } from './service/note.service';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  appState$: Observable<AppState<CustomHttpResponse>>;
  readonly Level = Level;
  readonly DataState = DataState;
  private dataSubject = new BehaviorSubject<CustomHttpResponse>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  isLoading$ = this.isLoadingSubject.asObservable();
  private selectedNoteSubject = new Subject<Note>();
  selectedNote$ = this.selectedNoteSubject.asObservable();
  private filteredSubject = new BehaviorSubject<Level>(Level.ALL);
  filteredLevel$ = this.filteredSubject.asObservable();

  constructor(private noteService: NoteService) {}

  ngOnInit(): void {
    this.appState$ = this.noteService.notes$.pipe(
      map((response) => {
        this.dataSubject.next(response);
        this.filteredSubject.next(Level.ALL);
        return { dataState: DataState.LOADED, data: response };
      }),
      startWith({ dataState: DataState.LOADING }),
      catchError((error: string) => {
        return of({ dataState: DataState.ERROR, error });
      })
    );
  }

  saveNote(noteForm: NgForm): void {
    this.isLoadingSubject.next(true);
    this.appState$ = this.noteService.save$(noteForm.value).pipe(
      map((response) => {
        this.dataSubject.next({
          ...response,
          notes: [response.notes[0], ...this.dataSubject.value.notes],
        });
        noteForm.reset({ title: '', description: '', level: this.Level.HIGH });
        document.getElementById('closeModal').click();
        this.isLoadingSubject.next(false);
        this.filteredSubject.next(Level.ALL);
        return { dataState: DataState.LOADED, data: this.dataSubject.value };
      }),
      startWith({ dataState: DataState.LOADED, data: this.dataSubject.value }),
      catchError((error: string) => {
        this.isLoadingSubject.next(false);
        return of({ dataState: DataState.ERROR, error });
      })
    );
  }

  updateNote(note: Note): void {
    this.isLoadingSubject.next(true);
    this.appState$ = this.noteService.update$(note).pipe(
      map((response) => {
        this.dataSubject.value.notes[
          this.dataSubject.value.notes.findIndex(
            (note) => note.id === response.notes[0].id
          )
        ] = response.notes[0];
        this.dataSubject.next({
          ...response,
          notes: this.dataSubject.value.notes,
        });
        document.getElementById('closeModalEdit').click();
        this.filteredSubject.next(Level.ALL);
        this.isLoadingSubject.next(false);
        return { dataState: DataState.LOADED, data: this.dataSubject.value };
      }),
      startWith({ dataState: DataState.LOADED, data: this.dataSubject.value }),
      catchError((error: string) => {
        this.isLoadingSubject.next(false);
        return of({ dataState: DataState.ERROR, error });
      })
    );
  }

  filterNotes(level: Level): void {
    this.filteredSubject.next(level);
    this.appState$ = this.noteService
      .filterNotes$(level, this.dataSubject.value)
      .pipe(
        map((response) => {
          return { dataState: DataState.LOADED, data: response };
        }),
        startWith({
          dataState: DataState.LOADED,
          data: this.dataSubject.value,
        }),
        catchError((error: string) => {
          return of({ dataState: DataState.ERROR, error });
        })
      );
  }

  deleteNote(noteId: number): void {
    this.appState$ = this.noteService.delete$(noteId).pipe(
      map((response) => {
        this.dataSubject.next({
          ...response,
          notes: this.dataSubject.value.notes.filter(
            (note) => note.id !== response.notes[0].id
          ),
        });
        this.filteredSubject.next(Level.ALL);
        return { dataState: DataState.LOADED, data: this.dataSubject.value };
      }),
      startWith({ dataState: DataState.LOADED, data: this.dataSubject.value }),
      catchError((error: string) => {
        return of({ dataState: DataState.ERROR, error });
      })
    );
  }

  selectNote(note: Note): void {
    this.selectedNoteSubject.next(note);
    document.getElementById('editNoteButton').click();
  }
}
